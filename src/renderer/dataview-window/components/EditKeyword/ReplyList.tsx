import React from 'react';
import { Stack, Text, IconButton, Image, Box } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

type ReplyListProps = {
  replyList: string[];
  handleReplyClick: (reply: string, index: number) => void;
  handleDeleteReply: (index: number) => void;
};

const getAttachmentPath = (reply: string) => {
  if (!reply.includes('[@]') || !reply.includes('[/@]')) {
    return null;
  }

  return reply.substring(reply.indexOf('[@]') + 3, reply.indexOf('[/@]'));
};

const isImagePath = (filePath: string) =>
  ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].some((ext) =>
    filePath.toLowerCase().endsWith(ext),
  );

const ReplyList = ({
  replyList,
  handleReplyClick,
  handleDeleteReply,
}: ReplyListProps) => (
  <Stack direction="row" spacing={4} wrap="wrap">
    {replyList.map((item, index) => {
      const attachmentPath = getAttachmentPath(item);
      const isImage = attachmentPath ? isImagePath(attachmentPath) : false;

      return (
        <Box
          key={index}
          p="2"
          borderRadius="md"
          borderWidth="1px"
          cursor="pointer"
          maxWidth="240px"
          onClick={() => handleReplyClick(item, index)}
        >
          {attachmentPath ? (
            <>
              <Text fontSize="sm" color="gray.500" mb={2}>
                {isImage ? '图片回复' : '文件回复'}
              </Text>
              {isImage ? (
                <Image
                  src={`file:///${attachmentPath.replace(/\\/g, '/')}`}
                  alt="reply attachment"
                  maxH="120px"
                  objectFit="contain"
                  mb={2}
                />
              ) : null}
              <Text
                fontSize="sm"
                style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
              >
                {attachmentPath}
              </Text>
            </>
          ) : (
            <Text style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
              {item}
            </Text>
          )}
          <IconButton
            mt={2}
            aria-label="Delete reply"
            icon={<DeleteIcon />}
            colorScheme="red"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteReply(index);
            }}
          />
        </Box>
      );
    })}
  </Stack>
);

export default ReplyList;
