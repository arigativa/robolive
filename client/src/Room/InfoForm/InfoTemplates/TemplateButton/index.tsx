import React from 'react'
import {
  Box,
  HStack,
  Kbd,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  ButtonGroup,
  Button,
  IconButton
} from '@chakra-ui/react'
import {
  DeleteIcon,
  RepeatClockIcon,
  ChevronDownIcon,
  LinkIcon
} from '@chakra-ui/icons'
import throttle from 'lodash.throttle'

import { SkeletonRect } from 'Skeleton'

const DELETE_CONFIRMATION_TIMEOUT_MS = 1500

const useKeybinding = (
  onKeybind: (key: string) => void
): [boolean, () => void] => {
  const [keybinding, setKeybinding] = React.useState(false)
  const onKeybindRef = React.useRef(onKeybind)

  React.useEffect(() => {
    onKeybindRef.current = onKeybind
  }, [onKeybind])

  React.useEffect(() => {
    if (!keybinding) {
      return
    }

    const listener = (event: KeyboardEvent): void => {
      onKeybindRef.current(event.key)
    }

    document.addEventListener('keypress', listener, { passive: true })

    return () => {
      document.removeEventListener('keypress', listener)
    }
  }, [keybinding])

  return [keybinding, React.useCallback(() => setKeybinding(x => !x), [])]
}

const ViewKeybindingMenuItem: React.VFC<{
  hotkey: null | string
  onKeybind(key: null | string): void
}> = ({ hotkey, onKeybind }) => {
  const [keybinding, toggleKeybinding] = useKeybinding(onKeybind)

  if (hotkey) {
    return (
      <MenuItem icon={<LinkIcon />} onClick={() => onKeybind(null)}>
        Unbind the hotkey <Kbd>{hotkey}</Kbd>
      </MenuItem>
    )
  }

  return (
    <MenuItem
      closeOnSelect={false}
      icon={<LinkIcon />}
      bgColor={keybinding ? 'gray.100' : 'white'}
      onClick={toggleKeybinding}
    >
      {keybinding ? 'Press a key...' : 'Bind a hotkey'}
    </MenuItem>
  )
}

const ViewMenu: React.VFC<{
  hotkey: null | string
  counting: boolean
  setCountdown(countdown: number): void
  onKeybind(key: null | string): void
}> = ({ hotkey, counting, setCountdown, onKeybind }) => {
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
        <ViewKeybindingMenuItem hotkey={hotkey} onKeybind={onKeybind} />

        <MenuItem
          icon={<DeleteIcon />}
          onClick={() => setCountdown(DELETE_CONFIRMATION_TIMEOUT_MS)}
        >
          Delete
        </MenuItem>
      </MenuList>
    </Menu>
  )
}

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

const useListenHotkey = (hotkey: null | string, onSubmit: () => void): void => {
  const onSubmitRef = React.useRef(onSubmit)

  React.useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

  React.useEffect(() => {
    if (hotkey == null) {
      return
    }

    const listener = throttle((event: KeyboardEvent): void => {
      if (event.key === hotkey) {
        onSubmitRef.current()
        event.preventDefault()
      }
    }, 100)

    document.addEventListener('keydown', listener)

    return () => {
      listener.cancel()
      document.removeEventListener('keydown', listener)
    }
  }, [hotkey])
}

export const TemplateButton: React.FC<{
  hotkey: null | string
  onSubmit(): void
  onKeybind(key: null | string): void
  onDelete(): void
}> = ({ hotkey, children, onSubmit, onKeybind, onDelete }) => {
  const [countdown, setCountdown] = useDeleteWithCountdown(onDelete)
  const counting = countdown > 0

  useListenHotkey(hotkey, onSubmit)

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
        <HStack opacity={counting ? 0 : 1} spacing="2">
          <span>{children}</span>
          {hotkey && <Kbd>{hotkey}</Kbd>}
        </HStack>
        {counting && <ViewCountdown seconds={countdown / 1000} />}
      </Button>

      <ViewMenu
        hotkey={hotkey}
        counting={counting}
        setCountdown={setCountdown}
        onKeybind={onKeybind}
      />
    </ButtonGroup>
  )
}

// S K E L E T O N

export const SkeletonTemplateButton = React.memo<{ width: number }>(
  ({ width }) => <SkeletonRect width={width} height={32} />
)
