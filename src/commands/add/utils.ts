import chalk from "chalk";
import { consola } from "consola";
import { AvailablePackage, InitOptions, PackageType } from "../../types.js";
import { installPackages, readConfigFile } from "../../utils.js";
import { spinner } from "./index.js";

export const Packages: {
  [key in PackageType]: {
    name: string;
    value: AvailablePackage;
    disabled?: boolean;
  }[];
} = {
  orm: [
    { name: "Drizzle", value: "drizzle" },
    { name: "Prisma", value: "prisma" },
  ],
};

const installList: { regular: string[]; dev: string[] } = {
  regular: [],
  dev: [],
};

export const addToInstallList = (packages: {
  regular: string[];
  dev: string[];
}) => {
  installList.regular.push(...packages.regular);
  installList.dev.push(...packages.dev);
};

export const installPackagesFromList = async () => {
  const { preferredPackageManager } = readConfigFile();

  if (installList.dev.length === 0 && installList.regular.length === 0) return;

  const dedupedList = {
    regular: [...new Set(installList.regular)],
    dev: [...new Set(installList.dev)],
  };

  const formattedInstallList = {
    regular: dedupedList.regular
      .map((i) => i.trim())
      .join(" ")
      .trim(),
    dev: dedupedList.dev
      .map((i) => i.trim())
      .join(" ")
      .trim(),
  };
  spinner.text = "Installing Packages";
  await installPackages(formattedInstallList, preferredPackageManager);
};

export const printNextSteps = (
  promptResponses: InitOptions,
  duration: number
) => {
  const config = readConfigFile();
  const ppm = config?.preferredPackageManager ?? "npm";

  const packagesInstalledList = [
    ...(promptResponses.orm === "drizzle"
      ? [
          `${chalk.underline("ORM")}: Drizzle (using ${
            promptResponses.dbProvider
          })`,
        ]
      : []),
    ...(promptResponses.orm === "prisma"
      ? [`${chalk.underline("ORM")}: Prisma`]
      : []),
  ];

  const wouldHaveSecrets = promptResponses.orm;

  const dbMigration = [
    ...[`Run \`${ppm} run db:generate\``],
    `Run \`${ppm} run db:${promptResponses.db === "pg" ? "migrate" : "push"}\``,
    `Run \`${ppm} run dev\``,
    "Open http://localhost:3000 in your browser",
  ];
  const runMigration =
    (promptResponses.orm && promptResponses.includeExample) ||
    promptResponses.orm;

  const nextSteps = [
    ...(wouldHaveSecrets ? ["Add Environment Variables to your .env"] : []),
    ...(runMigration ? dbMigration : []),
    "Build something awesome!",
  ];

  // const authProviderInstructions =
  //   promptResponses.authProviders && promptResponses.authProviders.length > 0
  //     ? promptResponses.authProviders.map((provider) => {
  //         return `${provider} auth: create credentials at ${AuthProviders[provider].website}\n  (redirect URI: /api/auth/callback/${provider})`;
  //       })
  //     : [];

  const notes = [];

  showNextSteps(packagesInstalledList, nextSteps, notes, duration);
};
export const createNextStepsList = (steps: string[]) => {
  return `
${chalk.bold.underline("Next Steps")}
${steps.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
};

export const createNotesList = (notes: string[]) => {
  return `
${chalk.bold.underline("Notes")}
${notes.map((item) => `- ${item}`).join("\n")}`;
};

const formatInstallList = (installList: string[]) => {
  return `${"The following packages are now installed and configured:"}
- ${installList.join("\n- ")}`;
};

export const showNextSteps = (
  installList: string[],
  steps: string[],
  notes: string[],
  duration: number
) => {
  const nextStepsFormatted = `🚀 Thanks for using Backend Forge to kickstart your backend app!

${formatInstallList(installList)}

${chalk.bgGreen(
  `[installed and configured in just ${duration / 1000} seconds]`
)}
${createNextStepsList(steps)}
${notes.length > 0 ? createNotesList(notes) : ""}

Hint: use \`backend-forge generate\` to quickly scaffold entire entities for your application`;
  consola.box(nextStepsFormatted);
};
