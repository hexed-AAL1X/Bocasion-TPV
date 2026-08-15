const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function readOption(options, ...keys) {
  if (!options || typeof options !== "object") return "";
  for (const key of keys) {
    const value = options[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isVirtualPrinter(name) {
  return /pdf|xps|document writer/i.test(name || "");
}

function extractDriverType(printer, options) {
  return (
    readOption(options, "printer-make-and-model") ||
    (typeof printer.description === "string" ? printer.description.trim() : "") ||
    printer.displayName ||
    printer.name ||
    "Impresora"
  );
}

function extractLocation(printer, options, platform) {
  const fromOptions = readOption(
    options,
    "printer-location",
    "printer-uri",
    "system_driver_options",
    "portname",
    "port",
  );
  if (fromOptions) return fromOptions;

  if (platform === "win32") {
    const winPort = readOption(options, "Port", "port");
    if (winPort) return winPort;
  }

  if (isVirtualPrinter(printer.name || printer.displayName)) {
    return "PORTPROMPT:";
  }

  return "";
}

function extractComment(options) {
  return readOption(options, "printer-info");
}

async function getLinuxPrinterDetails(printerName) {
  if (process.platform !== "linux" || !printerName) {
    return { location: "", comment: "", deviceUri: "" };
  }

  const details = { location: "", comment: "", deviceUri: "" };

  try {
    const { stdout } = await execFileAsync("lpstat", ["-l", "-p", printerName], { timeout: 3000 });
    const locationMatch = stdout.match(/^\s*Location:\s*(.+)$/im);
    const descriptionMatch = stdout.match(/^\s*Description:\s*(.+)$/im);
    if (locationMatch) details.location = locationMatch[1].trim();
    if (descriptionMatch) details.comment = descriptionMatch[1].trim();
  } catch {
    /* lpstat -l no disponible */
  }

  try {
    const { stdout } = await execFileAsync("lpstat", ["-v", printerName], { timeout: 3000 });
    const deviceMatch = stdout.match(/device for[^:]+:\s*(.+)$/im);
    if (deviceMatch) details.deviceUri = deviceMatch[1].trim();
  } catch {
    /* lpstat -v no disponible */
  }

  return details;
}

async function mapPrinterInfo(printer, platform) {
  const options =
    printer.options && typeof printer.options === "object" ? printer.options : {};
  const name = printer.name || printer.displayName || "Impresora";
  const displayName = printer.displayName || name;

  let driverType = extractDriverType(printer, options);
  let location = extractLocation(printer, options, platform);
  let comment = extractComment(options);

  if (platform === "linux") {
    const linuxDetails = await getLinuxPrinterDetails(name);
    if (!location) {
      location = linuxDetails.location || linuxDetails.deviceUri;
    }
    if (!comment && linuxDetails.comment) {
      const normalizedComment = linuxDetails.comment.trim();
      const normalizedDriver = driverType.trim();
      if (normalizedComment && normalizedComment !== normalizedDriver) {
        comment = normalizedComment;
      }
    }
  }

  return {
    name,
    displayName,
    description: driverType,
    portName: location,
    comment,
    driverType,
    location,
  };
}

module.exports = {
  mapPrinterInfo,
};
