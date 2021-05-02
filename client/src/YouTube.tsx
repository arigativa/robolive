import React from 'react'
import YouTubePlayer from 'youtube-player'

export const YouTube = React.memo<{
  videoId: string
  width?: string | number
  height?: string | number
  autoplay?: boolean
}>(({ videoId, width, height, autoplay = false }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (containerRef.current == null) {
      return
    }

    const player = YouTubePlayer(containerRef.current, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 0
      }
    })

    return () => {
      player.destroy()
    }
  }, [videoId, autoplay])

  return (
    <div style={{ width, height }}>
      <div ref={containerRef} />
    </div>
  )
})
