/**
 * Import a member from a module by URL, bypassing webpack.
 * @param {string} url URL to import from
 * @param {string} what Name of the member to import
 * @param {any} defaultValue Fallback value
 * @returns {Promise<any>} Imported member
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function importFromUrl(url: string, what: string, defaultValue: any = null): Promise<any> {
  try {
    const module = await import(/* webpackIgnore: true */ url);
    if (!Object.hasOwn(module, what)) {
      throw new Error(`No ${what} in module`);
    }
    return module[what];
  } catch (error) {
    console.error(`Failed to import ${what} from ${url}: ${error}`);
    return defaultValue;
  }
}

export const default_avatar = await importFromUrl("/script.js", "default_avatar") as string;
