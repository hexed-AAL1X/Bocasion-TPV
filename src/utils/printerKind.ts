/** Impresoras de ticket / térmicas 80 mm (no inkjet/láser de oficina). */
export function isLikelyThermalPrinter(name: string, driverType?: string): boolean {
  const hay = `${name} ${driverType ?? ""}`.toLowerCase();

  if (
    /l3\d{3}|l4\d{3}|l5\d{3}|l6\d{3}|ecotank|officejet|laserjet|deskjet|pixma|canon mg|brother hl|brother dcp|mfc-|samsung ml|xerox|workforce|wf-|series(?!.*tm)/i.test(
      hay,
    )
  ) {
    return false;
  }

  if (/tm-|tsp|tsp[0-9]|star tsp|receipt|thermal|pos|80mm|esc\/pos|ticket|zebra zq|rp80|rp326|bixolon|citizen ct|custom vk|epson tm|hasar|bematech/i.test(hay)) {
    return true;
  }

  return false;
}
