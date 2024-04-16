import { is, TServiceParams } from "@digital-alchemy/core";
import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { exit } from "process";

export function BuildTypes({
  logger,
  lifecycle,
  hass,
  type_writer,
  config,
  internal,
}: TServiceParams) {
  // ? join(__dirname, "..", "home-assistant", "src", "dynamic.d.ts")
  lifecycle.onReady(async () => {
    try {
      // install location
      // node_modules/@digital-alchemy/type-writer/dist/index.js
      //
      // relative target file
      // ../../hass/dist/dynamic.d.ts
      //
      const path = is.empty(config.type_writer.TARGET_FILE)
        ? join(__dirname, "..", "..", "hass", "dist", "dynamic.d.ts")
        : config.type_writer.TARGET_FILE;
      if (!existsSync(path)) {
        if (config.type_writer.TARGET_FILE !== path) {
          // Represents an error with the script
          // Calculated the wrong path, and something is up
          logger.fatal({ path }, `cannot locate target file, aborting`);
          return;
        }
        logger.warn({ path }, `creating new type definitions file`);
      }
      const text = await DoBuild();
      writeFileSync(path, text);
      logger.warn({ path }, `successfully wrote [hass] type definitions file`);
    } catch (error) {
      logger.fatal({ error }, `failed to write type definitions file`);
    }
    setImmediate(() => exit());
  });

  // see file - libs/home-assistant/src/dynamic.ts
  async function DoBuild() {
    logger.info(`Pulling information`);
    const typeInterface = await type_writer.call_service();
    const entities = await hass.fetch.getAllEntities();
    const entitySetup = {};
    entities.forEach(i =>
      internal.utils.object.set(entitySetup, i.entity_id, i),
    );
    return [
      `// This file is generated, and is automatically updated as a npm post install step`,
      "// Do not edit this file, it will only affect type definitions, not functional code",
      `import { PICK_ENTITY } from "./helpers";`,
      `export const ENTITY_SETUP = ${JSON.stringify(entitySetup, undefined, "  ")};`,
      typeInterface,
      type_writer.identifiers.area(),
      type_writer.identifiers.device(),
      type_writer.identifiers.floor(),
      type_writer.identifiers.label(),
      type_writer.identifiers.zone(),
    ].join(`\n\n`);
  }
}
