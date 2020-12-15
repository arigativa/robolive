import React from 'react'
import { css, cx, keyframes } from '@emotion/css'

import { range } from 'utils'

const COLOR_BASE = 'hsl(0 0% 86%)'
const COLOR_GLOW = 'hsl(0 0% 96%)'

const pxOrLen = (value: number | string): string => {
  if (typeof value === 'string') {
    return value
  }

  return `${value}px`
}

const animationGlow = keyframes`
  0% {
    background-position: -200px 0;
  }

  100% {
    background-position: calc(200px + 100%) 0;
  }
`

const background = css`
  animation: ${animationGlow} 1.2s ease-in-out infinite;
  background: ${COLOR_BASE} no-repeat;
  background-size: 200px 100%;
  background-image: linear-gradient(
    90deg,
    ${COLOR_BASE},
    ${COLOR_GLOW},
    ${COLOR_BASE}
  );
`

const cssText = css`
  display: inline-block;
  width: 100%;
  border-radius: 3px;
  line-height: 1;
  user-select: none;
`

/**
 * Text skeleton fills all possible width
 * simulating text height of content.
 *
 * @param [count=1] optional count of text rows
 */
export const SkeletonText: React.FC<{
  count?: number
}> = ({ count = 1 }) => {
  if (count <= 0) {
    return null
  }

  return (
    <>
      {range(count).map(i => (
        <span key={i} className={cx(background, cssText)}>
          &zwnj;
        </span>
      ))}
    </>
  )
}

type CssBlockProps = {
  inline?: boolean
  circle?: boolean
}

const cssBlock = ({ inline, circle }: CssBlockProps): string => css`
  display: ${inline ? 'inline-block' : 'block'};
  font-size: 0;
  border-radius: ${circle ? '50%' : '3px'};
  line-height: 1;
  vertical-align: top;
  user-select: none;
`

/**
 * Rectangle shape skeleton
 *
 * @param [className] optional class attribute
 * @param [inline] use display 'inline' instead of 'block'
 * @param width px in number or any other value via string
 * @param height px in number or any other value via string
 */
export const SkeletonRect: React.FC<{
  className?: string
  inline?: boolean
  width: number | string
  height: number | string
}> = ({ className, inline, width, height }) => (
  <div
    className={cx(background, cssBlock({ inline }), className)}
    style={{
      width: pxOrLen(width),
      height: pxOrLen(height)
    }}
  />
)

/**
 * Circle shape skeleton
 *
 * @param [className] optional class attribute
 * @param [inline] use display 'inline' instead of 'block'
 * @param size px in number or any other value via string
 */
export const SkeletonCircle: React.FC<{
  className?: string
  inline?: boolean
  size: number | string
}> = ({ className, inline, size }) => (
  <div
    className={cx(background, cssBlock({ inline, circle: true }), className)}
    style={{
      width: pxOrLen(size),
      height: pxOrLen(size)
    }}
  />
)
