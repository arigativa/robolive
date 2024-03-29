import React from 'react'
import { VStack, HStack, Button, Text } from '@chakra-ui/react'

export interface OutgoingInfoMessage {
  id: number
  content: string
  timestamp: Date
}

const parseMessageContent = (content: string): string => {
  try {
    return JSON.stringify(JSON.parse(content), null, 4)
  } catch {
    return content
  }
}

export const ViewInfoMessage = React.memo<{
  message: OutgoingInfoMessage
  onResend(): void
}>(({ message, onResend }) => {
  const parsedContent = React.useMemo(
    () => parseMessageContent(message.content),
    [message.content]
  )

  return (
    <VStack
      p="3"
      width="100%"
      shadow="md"
      borderWidth="1"
      borderRadius="md"
      wordBreak="break-all"
      alignItems="stretch"
    >
      <HStack justifyContent="space-between">
        <Text as="kbd" color="gray.400">
          #{message.id}
        </Text>

        <HStack>
          <Text as="time" fontSize="xs">
            {message.timestamp.toLocaleDateString()}{' '}
            {message.timestamp.toLocaleTimeString()}
          </Text>

          <Button size="xs" type="submit" colorScheme="teal" onClick={onResend}>
            Send again
          </Button>
        </HStack>
      </HStack>

      <Text
        as="pre"
        p="3"
        width="100%"
        borderRadius="sm"
        bg="gray.50"
        fontSize="sm"
      >
        {parsedContent}
      </Text>
    </VStack>
  )
})
