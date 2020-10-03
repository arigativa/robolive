import React, { ReactNode } from 'react'
import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import { Typography } from '@material-ui/core'
import Decode from 'frctl/Json/Decode'

import { Error as HttpError } from 'httpBuilder'
import styles from './styles.module.css'

const ViewRetrySection: React.FC<{
  onRetry(): void
}> = ({ onRetry: onClick }) => (
  <Box display="flex" justifyContent="center">
    <Button
      data-cy="forecast__retry"
      aria-label="Retry forecast request"
      variant="contained"
      color="primary"
      onClick={onClick}
    >
      Try again
    </Button>
  </Box>
)

const ViewContainer: React.FC<{
  title: ReactNode
}> = ({ title, children }) => (
  <Box data-cy="forecast-error-report__root" padding={6}>
    <Typography variant="h4" align="center">
      {title}
    </Typography>

    <Box marginTop={2}>{children}</Box>
  </Box>
)

const ErrorReport: React.FC<{
  error: HttpError
  onRetry(): void
}> = React.memo(({ error, onRetry }) =>
  error.cata({
    Timeout: () => (
      <ViewContainer title="You are facing a Timeout issue">
        <Typography paragraph align="center">
          It takes too long to get a response so please check your Internect
          connection and try again.
        </Typography>

        <ViewRetrySection onRetry={onRetry} />
      </ViewContainer>
    ),

    NetworkError: () => (
      <ViewContainer title="You are facing a Network Error">
        <Typography paragraph align="center">
          Pleace check your Internet connection and try again.
        </Typography>

        <ViewRetrySection onRetry={onRetry} />
      </ViewContainer>
    ),

    BadUrl: url => (
      <ViewContainer title="Oops... we broke something...">
        <Typography paragraph align="center">
          It looks like the app hits a wrong endpoint <code>{url}</code>.
        </Typography>
        <Typography paragraph align="center">
          We are fixing the issue.
        </Typography>
      </ViewContainer>
    ),

    BadStatus: ({ statusCode, body }) => {
      if (statusCode === 404) {
        return (
          <ViewContainer title="We can't find this city">
            <Typography paragraph align="center">
              Please make sure there is no mistake in the city name.
            </Typography>
          </ViewContainer>
        )
      }

      const [side, role] =
        statusCode < 500 ? ['Client', 'frontend'] : ['Server', 'backend']
      const message = Decode.field('message')
        .string.decodeJSON(body)
        .getOrElse(`Our ${role} developers are fixing the issue.`)

      return (
        <ViewContainer
          title={`You are facing an unexpected ${side} side Error ${statusCode}!`}
        >
          <Typography paragraph align="center">
            {message}
          </Typography>
        </ViewContainer>
      )
    },

    BadBody: decodeError => (
      <ViewContainer title="You are facing an unexpected Response Body Error!">
        <Typography paragraph align="center">
          Something went wrong and our apps seems don't communicate well...
        </Typography>

        <Box
          display="flex"
          justifyContent="center"
          overflow="auto"
          maxWidth="100%"
          padding={2}
          bgcolor=""
        >
          <pre className={styles.jsonCode}>
            {decodeError
              .stringify(4)
              .replace(/\\"/g, '"')
              .replace(/\s{3,}"/, '\n\n"')
              .replace(/\\n/g, '\n')}
          </pre>
        </Box>
      </ViewContainer>
    )
  })
)

export default ErrorReport
