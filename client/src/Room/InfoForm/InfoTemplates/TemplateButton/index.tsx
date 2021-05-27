import React from 'react'
import {
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  ButtonGroup,
  Button,
  IconButton
} from '@chakra-ui/react'
import { DeleteIcon, RepeatClockIcon, ChevronDownIcon } from '@chakra-ui/icons'

import { SkeletonRect } from 'Skeleton'

const DELETE_CONFIRMATION_TIMEOUT_MS = 1500

const ViewMenu: React.VFC<{
  counting: boolean
  setCountdown(countdown: number): void
}> = React.memo(({ counting, setCountdown }) => {
  if (counting) {
    return (
      <IconButton
        aria-label="Delete template"
        ml="-px"
        colorScheme="blue"
        onClick={() => setCountdown(0)}
      >
        <RepeatClockIcon />
      </IconButton>
    )
  }

  return (
    <Menu isLazy colorScheme="cyan" placement="bottom-end">
      <MenuButton
        as={IconButton}
        icon={<ChevronDownIcon />}
        aria-label="Delete template"
        ml="-px"
        variant="outline"
        colorScheme="teal"
      />

      <MenuList>
        <MenuItem
          icon={<DeleteIcon />}
          onClick={() => setCountdown(DELETE_CONFIRMATION_TIMEOUT_MS)}
        >
          Delete
        </MenuItem>
      </MenuList>
    </Menu>
  )
})

const ViewCountdown = React.memo<{ seconds: number }>(({ seconds }) => (
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

const useDeleteWithCountdown = (
  onDelete: () => void
): [number, (countdown: number) => void] => {
  const [countdown, setCountdown] = React.useState(0)
  const counting = countdown > 0
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

  return [countdown, setCountdown]
}

export const TemplateButton: React.FC<{
  onSubmit(): void
  onDelete(): void
}> = ({ children, onSubmit, onDelete }) => {
  const [countdown, setCountdown] = useDeleteWithCountdown(onDelete)
  const counting = countdown > 0

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
        {counting && <ViewCountdown seconds={countdown / 1000} />}
      </Button>

      <ViewMenu counting={counting} setCountdown={setCountdown} />
    </ButtonGroup>
  )
}

// S K E L E T O N

export const SkeletonTemplateButton = React.memo<{ width: number }>(
  ({ width }) => <SkeletonRect width={width} height={32} />
)
