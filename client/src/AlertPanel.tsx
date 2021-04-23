import React from 'react'
import {
  Alert,
  AlertStatus,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react'

export const AlertPanel: React.FC<{
  status: AlertStatus
  title?: string
}> = ({ status, title, children }) => (
  <Alert status={status}>
    <AlertIcon />
    {title && <AlertTitle>{title}</AlertTitle>}
    <AlertDescription>{children}</AlertDescription>
  </Alert>
)
