import { DBType } from "../../../../types.js";
import { readConfigFile } from "../../../../utils.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../filePaths/index.js";

export const createAuthRoute = () => {
  const { shared } = getFilePaths();

  const template = `import express from "express";

import { login, register } from "${formatFilePath(shared.controllersDir, {
    prefix: "alias",
    removeExtension: false,
  })}/auth.controller";

import { loginParams, registerParams } from "${formatFilePath(
    shared.orm.schemaDir,
    {
      prefix: "alias",
      removeExtension: false,
    }
  )}/auth";

import validator from "@/middlewares/validator"

const authRouter = express.Router()
authrouter.route("/login").post(validator(loginSchema),login);
authrouter.route("/register").post(validator(registerSchema),register);

export default authRouter;
    `;
  return template;
};

export const createAuthController = () => {
  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();

  const template = `import express from "express";
import bcrypt from "bcrypt";

import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";
import { login, register } from "${formatFilePath(shared.controllersDir, {
    prefix: "alias",
    removeExtension: false,
  })}/auth.controller";

import { loginParams, registerParams } from "${formatFilePath(
    shared.orm.schemaDir,
    {
      prefix: "alias",
      removeExtension: false,
    }
  )}/auth";

import { createAccessToken, createRefreshJWT, createTokenUser } from "${formatFilePath(
    shared.libDir,
    {
      prefix: "alias",
      removeExtension: false,
    }
  )}/jwt"
      
${findUserByEmail()}
${loginQuery()}`;

  return template;
};

export const findUserByEmail = () => {
  return `export const findUserByEmail = (email) => {
    return db.user.findUnique({
      where: {
        email,
      },
    });
  }`;
};

export const loginQuery = () => {
  return `export const login = async (body: loginParams) => {
  const { email, password } = loginPayloadSchema.parse(body);
  try {
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      res.status(403);
      throw new Error('Invalid login credentials.');
    }
    const validPassword = await bcrypt.compare(password, existingUser.password);
    if (!validPassword) {
      res.status(403);
      throw new Error('Invalid login credentials.');
    }
    const accessToken = createAccessToken({ payload: createTokenUser(existingUser) });
    const refreshToken = createRefreshJWT({ payload: createTokenUser(existingUser) });

    return { accessToken, refreshToken, user : createTokenUser(user) };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};

export const createPrismaAuthSchema = (driver: DBType) => {
  return `model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?


  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}`;
};

export const createDrizzleAuthSchema = (dbType: DBType) => {
  const { provider } = readConfigFile();
  switch (dbType) {
    case "pg":
      return `import {
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "@auth/core/adapters";

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey(account.provider, account.providerAccountId),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey(vt.identifier, vt.token),
  })
);
`;
    default:
      break;
  }
};

export const createJWTFunctions = () => {
  const { shared, drizzle } = getFilePaths();
  const { rootPath } = readConfigFile();

  return `import jwt from "jsonwebtoken";
  import { env } from "${formatFilePath(shared.init.envMjs, {
    removeExtension: false,
    prefix: "alias",
  })}";
  
  export const createAccessToken = ({ payload }) => {
    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXP,
    });
  
    return token;
  };
  
  export const createRefreshJWT = ({ payload }) => {
    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXP,
    });
  
    return token;
  };
  
  export const isTokenValid = ({ token }) => jwt.verify(token, env.JWT_SECRET);
  
  export const isRefreshTokenValid = ({ token }) =>
    jwt.verify(token, env.JWT_REFRESH_SECRET);
  
  const createTokenUser = (user) => {
    return {
      name: user.name,
      userId: user.id,
      email: user.email,
    };
  };`;
};
