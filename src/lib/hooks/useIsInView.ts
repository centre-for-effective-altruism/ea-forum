import { useEffect, useRef, useState } from "react"

export const useIsInView = <T extends HTMLElement>({
  rootMargin = '0px',
  threshold = 0,
} = {}) => {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const [node, setNode] = useState<T | null>(null)

  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!window.IntersectionObserver) return

    if (observer.current && node) observer.current.disconnect()

    observer.current = new window.IntersectionObserver(([ entry ]) => {
      setEntry(entry)
    }, {
      rootMargin,
      threshold
    })

    const { current: currentObserver } = observer

    if (node) currentObserver.observe(node)

    return () => currentObserver.disconnect()
  }, [node, rootMargin, threshold])

  return { setNode, entry, node }
}
