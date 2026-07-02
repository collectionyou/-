import React, { useState, useEffect } from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  TableContainer,
  useDisclosure,
  useToast,
  Text,
  Button,
  IconButton,
  Box,
  Skeleton,
  Stack,
  Tooltip,
  HStack,
  Grid,
  Input,
  Select,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, EditIcon } from '@chakra-ui/icons';
import { useQuery } from '@tanstack/react-query';
import EditKeyword from '../EditKeyword';
import {
  getReplyList,
  deleteReplyKeyword,
  updateReplyExcel,
  exportReplyExcel,
  getPlatformList,
} from '../../../common/services/platform/controller';
import { Keyword } from '../../../common/services/platform/platform';

const ReplyKeyword = () => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [editKeyword, setEditKeyword] = useState<Keyword | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [updated, setUpdated] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCurrentPage(0);
      setSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, refetch } = useQuery(
    ['replyList', currentPage, pageSize, platformId, search],
    () =>
      getReplyList({
        page: currentPage + 1,
        pageSize,
        ptfId: platformId,
        keyword: search,
      }),
    {
      retry: () => true,
      retryDelay: () => 1000,
    },
  );

  const { data: platforms, isLoading: isPlatformsLoading } = useQuery(
    ['platformList'],
    getPlatformList,
  );

  useEffect(() => {
    if (data) {
      setKeywords(data.data);
      setPageCount(Math.max(1, Math.ceil((data.total || 0) / pageSize)));
    }
  }, [data, pageSize]);

  const handleInsertFile = () => {
    window.electron.ipcRenderer.sendMessage('select-file', {
      filters: [{ name: 'Excel 模板', extensions: ['xls', 'xlsx'] }],
    });
    window.electron.ipcRenderer.once('selected-file', async (path) => {
      const selectedPath = path as string[];
      if (!selectedPath.length || !selectedPath[0]) return;

      setUpdated(true);
      try {
        await updateReplyExcel({ path: selectedPath[0] });
        refetch();
        toast({
          title: '导入成功',
          description: '导入成功',
          position: 'top',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
              ? e
              : JSON.stringify(e);

        toast({
          title: '导入失败',
          description: message,
          position: 'top',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setUpdated(false);
      }
    });
  };

  const handleExportReplyExcel = async () => {
    try {
      setUpdated(true);
      await exportReplyExcel();
      toast({
        title: '导出成功',
        description: '导出成功',
        position: 'top',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : JSON.stringify(e);

      toast({
        title: '导出失败',
        description: message,
        position: 'top',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setUpdated(false);
    }
  };

  const handleDoubleClick = (keyword: Keyword) => {
    setEditKeyword(keyword);
    onOpen();
  };

  const handleEdit = () => {
    refetch();
    onClose();
  };

  const handleDelete = async (id: number) => {
    await deleteReplyKeyword(id);
    refetch();
  };

  const handleAddKeyword = () => {
    const newKeyword: Keyword = {
      keyword: '',
      reply: '',
      mode: 'fuzzy',
      fuzzy: true,
      has_regular: false,
    };
    setKeywords([...keywords, newKeyword]);
    setEditKeyword(newKeyword);
    onOpen();
  };

  const getReplyDisplay = (reply: string) => {
    if (reply.includes('[@]') && reply.includes('[/@]')) {
      const filePath = reply.substring(reply.indexOf('[@]') + 3, reply.indexOf('[/@]'));
      const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].some(
        (ext) => filePath.toLowerCase().endsWith(ext),
      );
      return isImage ? `[图片] ${filePath}` : `[文件] ${filePath}`;
    }

    return reply;
  };

  if (isLoading || isPlatformsLoading) {
    return (
      <Stack>
        <Skeleton height="20px" />
        <Skeleton height="20px" />
        <Skeleton height="20px" />
      </Stack>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Text>编辑回复关键词</Text>
        <Flex alignItems="center">
          <HStack>
            <Button
              size="sm"
              leftIcon={<AddIcon />}
              color="white"
              bgGradient="linear(to-r, teal.500, green.500)"
              _hover={{
                bgGradient: 'linear(to-r, teal.300, green.300)',
              }}
              variant="solid"
              onClick={handleAddKeyword}
              isLoading={updated}
            >
              新增关键词
            </Button>
            <Tooltip label="导入并覆盖关键词">
              <Button
                size="sm"
                variant="solid"
                colorScheme="linkedin"
                onClick={handleInsertFile}
                isLoading={updated}
              >
                覆盖导入
              </Button>
            </Tooltip>
            <Tooltip label="导出关键词（下载模板）">
              <Button
                size="sm"
                variant="solid"
                onClick={handleExportReplyExcel}
                isLoading={updated}
              >
                导出
              </Button>
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      <HStack mb={3} spacing={3} align="stretch">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索关键词或回复内容"
        />
        <Select
          placeholder="全部平台"
          value={platformId}
          onChange={(e) => {
            setCurrentPage(0);
            setPlatformId(e.target.value);
          }}
          maxW="220px"
        >
          {platforms?.data.map((platform) => (
            <option key={platform.id} value={platform.id}>
              {platform.name}
            </option>
          ))}
        </Select>
        <Select
          value={String(pageSize)}
          onChange={(e) => {
            setCurrentPage(0);
            setPageSize(Number(e.target.value));
          }}
          maxW="120px"
        >
          <option value="20">20 条</option>
          <option value="50">50 条</option>
          <option value="100">100 条</option>
        </Select>
      </HStack>

      <TableContainer maxH="70vh" overflowY="scroll">
        <Table variant="striped" size="sm" className="table-tiny">
          <Thead>
            <Tr>
              <Th>平台</Th>
              <Th>关键词</Th>
              <Th>回复内容</Th>
              <Th>模糊匹配</Th>
              <Th>正则</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {keywords.map((keyword) => (
              <Tr
                sx={{ height: '30px' }}
                key={keyword.id}
                onDoubleClick={() => handleDoubleClick(keyword)}
              >
                <Td>{keyword.app_name}</Td>
                <Td
                  maxW="120px"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {keyword.keyword}
                </Td>
                <Td
                  maxW="220px"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {getReplyDisplay(keyword.reply)}
                </Td>
                <Td>{keyword.fuzzy ? '是' : '否'}</Td>
                <Td>{keyword.has_regular ? '是' : '否'}</Td>
                <Td>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    <Tooltip label="删除">
                      <IconButton
                        size="xs"
                        fontSize="13px"
                        colorScheme="red"
                        aria-label="Delete keyword"
                        icon={<DeleteIcon />}
                        onClick={() => keyword.id && handleDelete(keyword.id)}
                      />
                    </Tooltip>

                    <Tooltip label="编辑">
                      <IconButton
                        size="xs"
                        fontSize="13px"
                        colorScheme="blue"
                        aria-label="Edit keyword"
                        icon={<EditIcon />}
                        onClick={() => {
                          setEditKeyword(keyword);
                          onOpen();
                        }}
                      />
                    </Tooltip>
                  </Grid>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Flex mt={3} justify="space-between" align="center">
        <Text fontSize="sm" color="gray.500">
          共 {data?.total || 0} 条，第 {currentPage + 1} / {pageCount} 页
        </Text>
        <HStack>
          <Button
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            isDisabled={currentPage === 0}
          >
            上一页
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(Math.max(pageCount - 1, 0), prev + 1),
              )
            }
            isDisabled={currentPage >= pageCount - 1}
          >
            下一页
          </Button>
        </HStack>
      </Flex>

      <EditKeyword
        isOpen={isOpen}
        onClose={onClose}
        editKeyword={editKeyword}
        handleEdit={handleEdit}
      />
    </Box>
  );
};

export default ReplyKeyword;
