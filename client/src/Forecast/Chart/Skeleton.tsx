import React from 'react'
import Box, { BoxProps } from '@material-ui/core/Box'
import Grid from '@material-ui/core/Grid'
import Skeleton from '@material-ui/lab/Skeleton'
import colorsGrey from '@material-ui/core/colors/grey'

// S K E L E T O N

const ViewContainer: React.FC<BoxProps> = props => (
  <Grid container wrap="nowrap" {...props} />
)

const stylesItem = {
  flexGrow: 1
}

const ViewItem: React.FC = ({ children }) => (
  <Grid item style={stylesItem}>
    <Box paddingX="5px" display="flex" justifyContent="center">
      <Box width="100%" maxWidth="60px">
        {children}
      </Box>
    </Box>
  </Grid>
)

const SkeletonChart: React.FC<{ count?: number }> = React.memo(
  ({ count = 8 }) => {
    const range = new Array(count).fill(null)

    return (
      <Box paddingX="4px" paddingY={2}>
        <ViewContainer>
          {range.map((_, index) => (
            <ViewItem key={index}>
              <Skeleton variant="rect" width="100%" height="190px" />
            </ViewItem>
          ))}
        </ViewContainer>

        <Box borderTop={`1px solid ${colorsGrey[300]}`} paddingTop="10px">
          <ViewContainer>
            {range.map((_, index) => (
              <ViewItem key={index}>
                <Skeleton width="100%" />
              </ViewItem>
            ))}
          </ViewContainer>
        </Box>
      </Box>
    )
  }
)

export default SkeletonChart
