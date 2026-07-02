import express from 'express';
import cors from 'cors';
import asyncHandler from 'express-async-handler';
import bodyParser from 'body-parser';
import http from 'http';
import { Server } from 'socket.io';
import { BrowserWindow, shell } from 'electron';
import { sequelize } from './ormconfig';
import { ConfigController } from './controllers/configController';
import { MessageController } from './controllers/messageController';
import { KeywordReplyController } from './controllers/keywordReplyController';
import { MessageService } from './services/messageService';
import { DispatchService } from './services/dispatchService';
import { PluginService } from './services/pluginService';
import { AppService } from './services/appService';
import { LoggerService } from './services/loggerService';

class BKServer {
  private app: express.Application;

  private port: number;

  private server: http.Server;

  private io: Server;

  private configController: ConfigController;

  private messageController: MessageController;

  private keywordReplyController: KeywordReplyController;

  private messageService: MessageService;

  private pluginService: PluginService;

  private dispatchService: DispatchService;

  private loggerService: LoggerService;

  private appService: AppService;

  constructor(port: number, mainWindow: BrowserWindow) {
    this.app = express();
    this.app.use(bodyParser.json());
    this.app.use(cors());
    this.port = port;

    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
      transports: ['websocket'],
    });

    this.configController = new ConfigController();
    this.messageController = new MessageController();
    this.keywordReplyController = new KeywordReplyController(port);
    this.loggerService = new LoggerService(mainWindow);

    this.messageService = new MessageService(
      this.loggerService,
      this.keywordReplyController,
    );

    this.pluginService = new PluginService(
      this.loggerService,
      this.configController,
      this.messageService,
    );

    this.dispatchService = new DispatchService(
      mainWindow,
      this.loggerService,
      this.io,
      this.configController,
      this.messageService,
      this.messageController,
      this.pluginService,
    );

    this.appService = new AppService(this.dispatchService, sequelize);

    this.configureSocketIO();
    this.setupRoutes();
  }

  private configureSocketIO(): void {
    this.io.on('connection', (socket) => {
      this.dispatchService.registerHandlers(socket);

      socket.on('disconnect', () => {
        socket.removeAllListeners();
      });
    });
  }

  private setupRoutes(): void {
    this.app.post(
      '/api/v1/message/session',
      asyncHandler(async (req, res) => {
        const { page, pageSize, keyword, platformId } = req.body;
        const data = await this.messageController.getSessions({
          page,
          pageSize,
          keyword,
          platformId,
        });

        res.json({
          success: true,
          data,
        });
      }),
    );

    this.app.post(
      '/api/v1/message/list',
      asyncHandler(async (req, res) => {
        const { sessionId } = req.body;
        const data = await this.messageController.getMessages(sessionId);
        res.json({
          success: true,
          data,
        });
      }),
    );

    this.app.get('/api/v1/message/excel', async (_req, res) => {
      try {
        const filePath = await this.messageController.exportExcel();
        shell.openPath(filePath);
        res.json({ success: true, data: filePath });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get(
      '/api/v1/base/platform/all',
      asyncHandler(async (_req, res) => {
        const data = await this.dispatchService.getAllPlatforms();
        res.json({
          success: data && data.length > 0,
          data,
        });
      }),
    );

    this.app.get(
      '/api/v1/base/platform/active',
      asyncHandler(async (req, res) => {
        const { appId, instanceId } = req.query;
        const active = await this.configController.checkConfigActive({
          appId: appId ? String(appId) : undefined,
          instanceId: instanceId ? String(instanceId) : undefined,
        });
        res.json({
          success: true,
          data: {
            active,
          },
        });
      }),
    );

    this.app.post(
      '/api/v1/base/platform/active',
      asyncHandler(async (req, res) => {
        const { appId, instanceId, active } = req.body;
        await this.configController.activeConfig({
          appId: appId ? String(appId) : undefined,
          instanceId: instanceId ? String(instanceId) : undefined,
          active,
        });
        res.json({
          success: true,
        });
      }),
    );

    this.app.get(
      '/api/v1/base/setting',
      asyncHandler(async (req, res) => {
        const { appId, instanceId, type } = req.query;
        const data = {
          appId: appId ? String(appId) : undefined,
          instanceId: instanceId ? String(instanceId) : undefined,
          type: type ? String(type) : ('generic' as any),
        };

        const obj = await this.configController.getConfigByType(data);
        const active = await this.configController.checkConfigActive(data);

        res.json({
          success: true,
          data: {
            ...obj,
            active,
          },
        });
      }),
    );

    this.app.post(
      '/api/v1/base/setting',
      asyncHandler(async (req, res) => {
        const { appId, instanceId, type, cfg } = req.body;
        const data = {
          appId: appId ? String(appId) : undefined,
          instanceId: instanceId ? String(instanceId) : undefined,
          type: type ? String(type) : 'generic',
          cfg,
        };

        await this.configController.updateConfigByType(data);
        await this.dispatchService.syncConfig();
        res.json({ success: true });
      }),
    );

    this.app.post('/api/v1/base/sync', async (_req, res) => {
      try {
        await this.dispatchService.syncConfig();
        res.json({ success: true });
      } catch (error) {
        if (error instanceof Error) {
          res.status(500).json({ success: false, message: error.message });
        }
      }
    });

    this.app.get('/api/v1/reply/list', async (req, res) => {
      const {
        page = 1,
        page_size: pageSize,
        ptf_id: platformId,
        keyword = '',
      } = req.query;

      const query = {
        page: Number(page),
        pageSize: Number(pageSize),
        platformId,
        keyword,
      };

      const { total, autoReplies } =
        // @ts-ignore
        await this.keywordReplyController.list(query);

      const ptfs = await this.dispatchService.getAllPlatforms();
      const ptfMap = new Map(ptfs.map((ptf) => [ptf.id, ptf]));
      const results: any[] = [];
      autoReplies.forEach((item) => {
        const ptf = ptfMap.get(item.platform_id);
        results.push({
          id: item.id,
          platform_id: item.platform_id,
          keyword: item.keyword,
          reply: item.reply,
          mode: item.mode,
          fuzzy: item.fuzzy,
          has_regular: item.has_regular,
          app_name: ptf ? ptf.name : '全局',
        });
      });

      res.json({
        success: true,
        data: results,
        total,
        page,
        page_size: pageSize,
      });
    });

    this.app.post('/api/v1/reply/create', async (req, res) => {
      const {
        platform_id: platformId,
        keyword,
        reply,
        mode,
        fuzzy,
        has_regular,
      } = req.body;
      await this.keywordReplyController.create({
        mode,
        platform_id: platformId,
        keyword,
        reply,
        fuzzy,
        has_regular,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/reply/update', async (req, res) => {
      const {
        id,
        platform_id: platformId,
        keyword,
        reply,
        mode,
        fuzzy,
        has_regular,
      } = req.body;
      await this.keywordReplyController.update(id, {
        mode,
        platform_id: platformId,
        keyword,
        reply,
        fuzzy,
        has_regular,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/reply/delete', async (req, res) => {
      const { id } = req.body;
      await this.keywordReplyController.delete(id);
      res.json({ success: true });
    });

    this.app.post('/api/v1/reply/excel', async (req, res) => {
      const { path } = req.body;
      try {
        await this.keywordReplyController.importExcel(path);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/reply/excel', async (_req, res) => {
      try {
        const filePath = await this.keywordReplyController.exportExcel();
        shell.openPath(filePath);
        res.json({ success: true, data: filePath });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/transfer/list', async (req, res) => {
      const { page = 1, page_size: pageSize, app_id: appId } = req.query;

      const query = {
        page,
        pageSize,
        appId,
      };

      const { total, transferKeywords } =
        // @ts-ignore
        await this.keywordReplyController.listTransferKeywords(query);

      const ptfs = await this.dispatchService.getAllPlatforms();
      const ptfMap = new Map(ptfs.map((ptf) => [ptf.id, ptf]));
      const results: any[] = [];
      transferKeywords.forEach((item) => {
        const ptf = ptfMap.get(item.app_id);
        results.push({
          id: item.id,
          keyword: item.keyword,
          has_regular: item.has_regular,
          fuzzy: item.fuzzy,
          app_id: item.app_id,
          app_name: ptf ? ptf.name : '全局',
        });
      });

      res.json({
        success: true,
        data: results,
        total,
        page,
        page_size: pageSize,
      });
    });

    this.app.post('/api/v1/transfer/create', async (req, res) => {
      const { app_id: appId, keyword, has_regular, fuzzy } = req.body;
      await this.keywordReplyController.createTransfer({
        app_id: appId,
        keyword,
        has_regular,
        fuzzy,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/transfer/update', async (req, res) => {
      const { id, app_id: appId, keyword, has_regular, fuzzy } = req.body;
      await this.keywordReplyController.updateTransfer(id, {
        app_id: appId,
        keyword,
        has_regular,
        fuzzy,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/transfer/delete', async (req, res) => {
      const { id } = req.body;
      await this.keywordReplyController.deleteTransfer(id);
      res.json({ success: true });
    });

    this.app.post('/api/v1/transfer/excel', async (req, res) => {
      const { path } = req.body;
      try {
        await this.keywordReplyController.importTransferExcel(path);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/transfer/excel', async (_req, res) => {
      try {
        const filePath = await this.keywordReplyController.exportTransferExcel();
        shell.openPath(filePath);
        res.json({ success: true, data: filePath });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/replace/list', async (req, res) => {
      const { page = 1, page_size: pageSize, app_id: appId } = req.query;

      const query = {
        page,
        pageSize,
        appId,
      };

      const { total, replaceKeywords } =
        // @ts-ignore
        await this.keywordReplyController.listReplaceKeywords(query);

      const ptfs = await this.dispatchService.getAllPlatforms();
      const ptfMap = new Map(ptfs.map((ptf) => [ptf.id, ptf]));
      const results: any[] = [];
      replaceKeywords.forEach((item) => {
        const ptf = ptfMap.get(item.app_id);
        results.push({
          id: item.id,
          keyword: item.keyword,
          replace: item.replace,
          app_id: item.app_id,
          app_name: ptf ? ptf.name : '全局',
          has_regular: item.has_regular,
          fuzzy: item.fuzzy,
        });
      });

      res.json({
        success: true,
        data: results,
        total,
        page,
        page_size: pageSize,
      });
    });

    this.app.post('/api/v1/replace/create', async (req, res) => {
      const { app_id: appId, keyword, replace } = req.body;
      await this.keywordReplyController.createReplace({
        app_id: appId,
        keyword,
        replace,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/replace/update', async (req, res) => {
      const { id, app_id: appId, keyword, replace } = req.body;
      await this.keywordReplyController.updateReplace(id, {
        app_id: appId,
        keyword,
        replace,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/replace/delete', async (req, res) => {
      const { id } = req.body;
      await this.keywordReplyController.deleteReplace(id);
      res.json({ success: true });
    });

    this.app.post('/api/v1/replace/excel', async (req, res) => {
      const { path } = req.body;
      try {
        await this.keywordReplyController.importReplaceExcel(path);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/replace/excel', async (_req, res) => {
      try {
        const filePath = await this.keywordReplyController.exportReplaceExcel();
        shell.openPath(filePath);
        res.json({ success: true, data: filePath });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.get('/api/v1/plugin/list', async (_req, res) => {
      const plugins = await this.configController.getAllCustomPlugins();
      const results = plugins.map((plugin) => ({
        id: plugin.id,
        code: plugin.code,
        title: plugin.title,
        description: plugin.description,
        icon: plugin.icon,
        source: plugin.source,
        author: plugin.author,
        type: plugin.type,
        tags: JSON.parse(plugin.tags || '[]'),
      }));
      res.json({
        success: true,
        data: results,
      });
    });

    this.app.get('/api/v1/plugin/detail', async (req, res) => {
      const { id } = req.query;
      const plugin = await this.configController.getPluginConfig(Number(id));
      if (!plugin) {
        res.json({
          success: false,
          data: null,
        });
        return;
      }

      const tags = JSON.parse(plugin.tags || '[]');
      res.json({
        success: true,
        data: {
          id: plugin.id,
          code: plugin.code,
          title: plugin.title,
          description: plugin.description,
          icon: plugin.icon,
          source: plugin.source,
          author: plugin.author,
          type: plugin.type,
          tags,
        },
      });
    });

    this.app.post('/api/v1/plugin/create', async (req, res) => {
      const { code, source, author, description, icon, tags, title } = req.body;
      const plugin = await this.configController.createCustomPlugin({
        code,
        source,
        author,
        description,
        icon,
        tags: JSON.stringify(tags),
        title,
      });
      if (!plugin) {
        res.json({
          success: false,
          data: null,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: plugin.id,
          code: plugin.code,
          title: plugin.title,
          description: plugin.description,
          icon: plugin.icon,
          source: plugin.source,
          author: plugin.author,
          type: plugin.type,
          tags,
        },
      });
    });

    this.app.post('/api/v1/plugin/update', async (req, res) => {
      const { id, code, description, icon, tags, title } = req.body;
      await this.configController.updateCustomPlugin({
        pluginId: id,
        code,
        description,
        icon,
        tags: JSON.stringify(tags),
        title,
      });
      res.json({ success: true });
    });

    this.app.post('/api/v1/plugin/delete', async (req, res) => {
      const { id } = req.body;
      await this.configController.deleteCustomPlugin(id);
      res.json({ success: true });
    });

    this.app.get('/api/v1/base/health', async (_req, res) => {
      try {
        const resp = await this.dispatchService.checkHealth();
        if (resp) {
          res.json({
            success: true,
            data: true,
          });
          return;
        }
      } catch (error) {
        console.error(error);
      }

      res.json({
        success: false,
        data: false,
      });
    });

    this.app.post('/api/v1/base/gpt/health', async (req, res) => {
      const { cfg } = req.body;
      try {
        const resp = await this.messageService.checkGptHealth(cfg);
        res.json(resp);
      } catch (error) {
        res.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    this.app.post('/api/v1/base/plugin/check', async (req, res) => {
      try {
        const { code, messages, ctx } = req.body;
        const ctxMap = new Map(Object.entries(ctx));
        const resp = await this.pluginService.checkPlugin(
          code,
          // @ts-ignore
          ctxMap,
          messages,
        );
        res.json(resp);
      } catch (error) {
        res.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: error instanceof Error ? error.message : String(error),
          consoleOutput: [],
        });
      }
    });

    this.app.get('/api/v1/strategy/tasks', async (_req, res) => {
      try {
        const tasks = await this.appService.getTasks();
        res.json({
          success: true,
          data: tasks,
        });
      } catch (error) {
        console.error(error);
        res.json({
          success: false,
          data: null,
        });
      }
    });

    this.app.post('/api/v1/strategy/tasks', async (req, res) => {
      const { appId } = req.body;
      try {
        const task = await this.appService.addTask(String(appId));
        res.json({
          success: true,
          data: task,
        });
      } catch (error) {
        res.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          data: null,
        });
      }
    });

    this.app.post('/api/v1/strategy/task/remove', async (req, res) => {
      const { taskId } = req.body;
      try {
        await this.appService.removeTask(String(taskId));
        res.json({
          success: true,
        });
      } catch (error) {
        console.error(error);
        res.json({
          success: false,
        });
      }
    });
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.server
        .listen(this.port, () => {
          console.log(`Server is running on http://localhost:${this.port}`);
          resolve(true);
        })
        .on('error', reject);
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(true);
        });
      } else {
        reject(new Error('Server not initialized'));
      }
    });
  }
}

export default BKServer;
