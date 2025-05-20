'use client'

import type { SVGProps } from 'react'

export function ErrorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...props}>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="currentColor" stroke-width="2">
          <line x1="13" y1="7" x2="7" y2="13"></line>
          <line x1="7" y1="7" x2="13" y2="13"></line>
        </g>
      </g>
    </svg>
  )
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...props}>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="currentColor" stroke-width="2">
          <line x1="10" y1="14" x2="10" y2="10"></line>
          <line x1="10" y1="6" x2="10.01" y2="6"></line>
        </g>
      </g>
    </svg>
  )
}

export function SuccessIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...props}>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="currentColor" stroke-width="2">
          <polyline points="14.7272727 7 8.72727273 13 6 10.2727273"></polyline>
        </g>
      </g>
    </svg>
  )
}

export function WarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" {...props}>
      <title>编组</title>
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="currentColor" stroke-width="2">
          <line x1="10" y1="6" x2="10" y2="10"></line>
          <line x1="10" y1="14" x2="10.01" y2="14"></line>
        </g>
      </g>
    </svg>
  )
}
