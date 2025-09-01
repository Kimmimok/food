export function calcLine(price: number, qty: number, opt = 0) {
  return (price + opt) * qty
}
