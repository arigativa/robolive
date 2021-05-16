import React from 'react'
import { Box, ButtonGroup, Button, IconButton } from '@chakra-ui/react'
import { DeleteIcon, RepeatClockIcon } from '@chakra-ui/icons'

import { SkeletonRect } from 'Skeleton'

const DELETE_CONFIRMATION_TIMEOUT_MS = 1000

const Countdown = React.memo<{ seconds: number }>(({ seconds }) => (
  <Box
    position="absolute"
    top="0"
    right="0"
    bottom="0"
    left="0"
    fontFamily="monospace"
    display="flex"
    alignItems="center"
    justifyContent="center"
  >
    {seconds.toFixed(2)}
  </Box>
))

export const TemplateButton: React.FC<{
  onSubmit(): void
  onDelete(): void
}> = ({ children, onSubmit, onDelete }) => {
  const [countDown, setCountdown] = React.useState<number>(0)
  const counting = countDown > 0
  const onDeleteRef = React.useRef(onDelete)

  React.useEffect(() => {
    onDeleteRef.current = onDelete
  }, [onDelete])

  React.useEffect(() => {
    if (!counting) {
      return
    }

    const end = DELETE_CONFIRMATION_TIMEOUT_MS + Date.now()

    const timeoutId = setInterval(() => {
      const remaining = Math.max(0, end - Date.now())

      setCountdown(remaining)

      if (remaining === 0) {
        onDeleteRef.current()
      }
    }, 60)

    return () => clearTimeout(timeoutId)
  }, [counting])

  return (
    <ButtonGroup isAttached size="sm">
      <Button
        variant="outline"
        colorScheme="teal"
        position="relative"
        overflow="hidden"
        onClick={() => {
          if (counting) {
            // in case a user clicks to countdown to abort deleting
            setCountdown(0)
          } else {
            onSubmit()
          }
        }}
      >
        <Box opacity={counting ? 0 : 1}>{children}</Box>
        {counting && <Countdown seconds={countDown / 1000} />}
      </Button>

      <IconButton
        aria-label="Delete template"
        ml="-px"
        colorScheme={counting ? 'blue' : 'pink'}
        onClick={() =>
          setCountdown(counting ? 0 : DELETE_CONFIRMATION_TIMEOUT_MS)
        }
      >
        {counting ? <RepeatClockIcon /> : <DeleteIcon />}
      </IconButton>
    </ButtonGroup>
  )
}

// S K E L E T O N

export const SkeletonTemplateButton = React.memo<{ width: number }>(
  ({ width }) => <SkeletonRect width={width} height={32} />
)
