import { Color } from 'three'

export function getColor(ratio: number) {
  // const hue = ratio * 0.7 // 0.7限制色相范围避免循环回红色
  // const saturation = 0.9
  // const lightness = 0.5
  // const color = new Color().setHSL(hue, saturation, lightness)
  // return `rgba(${Math.round(color.r * 255)}, ${Math.round(
  //   color.g * 255
  // )}, ${Math.round(color.b * 255)}, 0.5)`

  // const t = Math.max(0, Math.min(1, value))

  // 冷色(蓝色): 0,100,255
  // 暖色(红色): 255,50,0
  const r = Math.round(0 + (255 - 0) * ratio)
  const g = Math.round(100 + (50 - 100) * ratio)
  const b = Math.round(255 + (0 - 255) * ratio)

  return `rgb(${r},${g},${b})`
}
