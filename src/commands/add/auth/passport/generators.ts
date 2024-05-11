import { DBType } from "../../../../types.js";
import { readConfigFile } from "../../../../utils.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../filePaths/index.js";

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
  
  export const isTokenValid = ( token ) => jwt.verify(token, env.JWT_SECRET);
  
  export const isRefreshTokenValid = ( token ) =>
    jwt.verify(token, env.JWT_REFRESH_SECRET);

  export const decodeRefreshToken = (token) =>
    jwt.verify(token, env.JWT_REFRESH_SECRET);
  
  export const createTokenUser = (user) => {
    return {
      name: user.name,
      userId: user.id,
      email: user.email,
    };
  };`;
};

export const createAuthRoute = () => {
  const { shared } = getFilePaths();

  const template = `import { Router } from "express";

import { login, register, refreshToken, logout } from "${formatFilePath(
    shared.controllersDir,
    {
      prefix: "alias",
      removeExtension: false,
    }
  )}/auth.controller";

import { loginParams, registerParams } from "${formatFilePath(
    shared.orm.schemaDir,
    {
      prefix: "alias",
      removeExtension: false,
    }
  )}/auth";

import validator from "@/middlewares/validator"

const router = Router()
router.route("/login").post(validator(loginSchema),login);
router.route("/logout").post(logout);
router.route("/register").post(validator(registerSchema),register);
router.route("/refresh-token").post(refreshToken);

export default router;`;
  return template;
};

export const createAuthController = () => {
  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();

  const template = `import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import { httpStatus } from 'http-status';

import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";

import {
  loginParams,
  registerParams,
  registerPayloadSchema,
  loginPayloadSchema,
} from "${formatFilePath(shared.orm.schemaDir, {
    prefix: "alias",
    removeExtension: false,
  })}/auth";

import {
  createAccessToken,
  createRefreshJWT,
  createTokenUser,
  decodeRefreshToken,
} from "${formatFilePath(shared.libDir, {
    prefix: "alias",
    removeExtension: false,
  })}/jwt"
import { ApiError } from "@/utils/api-error";
import { ApiResponse } from "@/utils/api-response";

const options = {
  httpOnly: true,
  secure: true
}
      
${findUserByEmail()}

${registerQuery()}

${loginQuery()}

${logoutQuery()}

${refreshTokenQuery()}
`;

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

const loginQuery = () => {
  return `export const login = async (req: Request, res: Response) => {
    try {
    const { email, password } = loginPayloadSchema.parse(req.body);
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Invalid login credentials.');
    }
    const validPassword = await bcrypt.compare(password, existingUser.password);
    if (!validPassword) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Invalid login credentials.');
    }
    const accessToken = createAccessToken({ payload: createTokenUser(existingUser) });
    const refreshToken = createRefreshJWT({ payload: createTokenUser(existingUser) });

    return res
    .status(httpStatus.OK)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            httpStatus.OK, 
            {
                user: existingUser, accessToken
            },
            "User logged In Successfully"
        )
    );
    } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error?.message)
  }
};
`;
};

const registerQuery = () => {
  return `const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = registerPayloadSchema.parse(req.body);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "User with email or username already exists"
      );
    }

    const hashedPassword: string = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: email,
        username: username,
        password: hashedPassword,
        refreshToken: refreshToken,
      },
    });

    const accessToken = createAccessToken({ payload: createTokenUser(user) });
    const refreshToken = createRefreshJWT({ payload: createTokenUser(user) });

    const user = await createUserByEmailAndPassword({
      email,
      password,
      refreshToken,
    });

    if (!user) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(httpStatus.OK)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          httpStatus.OK,
          {
            user,
            accessToken,
          },
          "User registered successfully"
        )
      );
  } catch (error) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error?.message);
  }
};`;
};

const logoutQuery = () => {
  return `const logout = async (req: Request, res: Response) => {
  try {
    const cookies = req.cookies;

    const response: RouteResponse<null> = {
      code: 204,
      data: null,
      error: null,
      message: "No content.",
      success: true,
    };

    if (!cookies?.refreshToken) {
      return res.status(httpStatus.NO_CONTENT).json( new ApiResponse(
        httpStatus.NO_CONTENT,
       {}
        "No Content"
      ));
    }

    const refreshToken = cookies.refreshToken;
    await db.user.update({
      where: { refreshToken: refreshToken },
      data: { refreshToken: "" },
    });

    return res
      .status(httpStatus.OK)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(httpStatus.OK, {}, "User logged Out"));

  } catch (error) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error?.message);
  }
};`;
};

const refreshTokenQuery = () => {
  return `const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: incomingRefreshToken } = req.cookies || req.body;

    if (!incomingRefreshToken) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "You are not authorized to make this request."
      );
    }

    if (!isRefreshTokenValid(incomingRefreshToken)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    const decodedToken = decodeRefreshToken(incomingRefreshToken);

    const existingUser = await db.user.findUnique({
      where: { email: decodedToken.email },
    });

    if (!existingUser || incomingRefreshToken !== existingUser.refreshToken) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Refresh token is expired or used"
      );
    }

    if (!isTokenValid(incomingRefreshToken)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }

    const accessToken = createAccessToken({
      payload: createTokenUser(existingUser),
    });
    const newRefreshToken = createRefreshJWT({
      payload: createTokenUser(existingUser),
    });

    res
      .status(httpStatus.OK)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          httpStatus.OK,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error?.message);
  }
};`;
};

export const createPrismaAuthSchema = (driver: DBType) => {
  return `model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id                String    @id @default(cuid())
  name              String?
  email             String?   @unique
  image             String?
  refresh_token     String?  @db.Text
  access_token      String?  @db.Text
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

export const createIsAuthMiddleware = () => {
  const { shared } = getFilePaths();

  return `import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { env } from "${formatFilePath(shared.init.envMjs, {
    removeExtension: false,
    prefix: "alias",
  })}";
import jwt, { type JwtPayload } from 'jsonwebtoken';

const { verify } = jwt;

const isAuth = (req: Request, res: Response, next: NextFunction) => {

  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader?.startsWith('Bearer ')) {
    return res.sendStatus(httpStatus.UNAUTHORIZED);
  }

  const token: string | undefined = authHeader.split(' ')[1];

  if (!token) return res.sendStatus(httpStatus.UNAUTHORIZED);

  verify(
    token,
    env.access_token.secret,
    (err: unknown, payload: JwtPayload) => {
      if (err) return res.sendStatus(httpStatus.FORBIDDEN);
      req.payload = payload;

      next();
    }
  );
};
  
export default isAuth;`;
};
