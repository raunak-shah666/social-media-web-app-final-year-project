import { auth } from '../lib/auth.js';
import { AppError } from '../middlewares/errorHandler.js';
import { type Request, type Response } from 'express';
import { APIResponse } from '../lib/apiResponse.ts';
import { deleteFromCloudinary, uploadToCloudinary } from '../lib/cloudinary.ts';
import { db } from '../lib/db/client.ts';
import { user } from '../lib/auth-schema.ts';
import { eq, and, not, or, ilike } from 'drizzle-orm';
import { APIError } from 'better-auth';

export async function me(req: Request, res: Response) {
  if (!req.session) {
    throw new AppError('User not logged in', 400);
  }

  return res.json(
    new APIResponse('User session fetched successfully', 200, req.session),
  );
}

export async function signin(req: Request, res: Response) {
  try {
    const { password, username }: { password: string; username: string } =
      req.body;
    if (!username) {
      throw new AppError('Email or Username are required', 400);
    }

    if (!password) {
      throw new AppError('Password is required', 400);
    }

    let response = null;
    // Is not an email, hence user is signing in through username
    if (
      !username.match(
        /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,
      )
    ) {
      response = await auth.api.signInUsername({
        returnHeaders: true,
        body: { username, password },
      });
    } else {
      response = await auth.api.signInEmail({
        returnHeaders: true,
        body: { email: username, password },
      });
    }

    const setCookies = response.headers.getSetCookie();
    if (setCookies.length) {
      res.setHeader('Set-Cookie', setCookies);
    }

    return res
      .status(200)
      .json(
        new APIResponse('User signed in successfully', 200, response.response),
      );
  } catch (error) {
    console.error('signin :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function signup(req: Request, res: Response) {
  console.log('BODY ::: ', req.body);
  if (!req.body) {
    console.error('Request body is missing');
    throw new AppError('Request body is missing', 400);
  }
  try {
    const {
      email,
      password,
      name,
      username,
    }: { email: string; password: string; name: string; username: string } =
      req.body;
    if (!email || !password || !name || !username) {
      console.error('Email, Username, Password and Name are required');
      throw new AppError('Email, Password and Name are required', 400);
    }

    if (
      !email.match(
        /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g,
      )
    ) {
      throw new AppError('Email is not valid', 400);
    }

    if (
      !password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm)
    ) {
      throw new AppError(
        `Password must contain: 
        - at least 8 characters
- must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number
- Can contain special characters`,
        400,
      );
    }
    console.log('Request body is valid');

    if (req.file && !req.file.mimetype.startsWith('image/')) {
      throw new AppError('Profile picture must be an image');
    }
    let imgUrl;
    if (req.file && req.file.mimetype.startsWith('image/')) {
      const result = await uploadToCloudinary(req.file.buffer);
      if (!result) {
        throw new AppError('Error while uploading profile image');
      }
      imgUrl = result.secure_url;
    }

    const response = await auth.api.signUpEmail({
      returnHeaders: true,
      body: { email, password, name, image: imgUrl, username },
    });

    const setCookies = response.headers.getSetCookie();
    if (setCookies.length) {
      console.log('COOKIES :: ', setCookies);
      res.setHeader('Set-Cookie', setCookies);
    }

    console.log('Response from sign up email:', response);
    return res
      .status(201)
      .json(
        new APIResponse('User signed up successfully', 201, response.response),
      );
  } catch (error) {
    console.error('signup :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const response = await auth.api.signOut({
      headers: req.headers,
      returnHeaders: true,
    });
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length) {
      console.log('COOKIES :: ', setCookies);
      res.setHeader('Set-Cookie', setCookies);
    }
    return res
      .status(200)
      .json(new APIResponse('User logged out successfully', 200));
  } catch (error) {
    console.error('logout :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User needs to be logged in to update details', 400);
    }

    if (!req.body) {
      throw new AppError('Request body is empty', 400);
    }

    const { username, name } = req.body;

    if (!username && !name && !req.file) {
      throw new AppError('No updated details provided', 400);
    }

    if (req.file && !req.file.mimetype.startsWith('image/')) {
      throw new AppError('Profile picture must be an image');
    }
    let imgUrl = null;
    if (req.file && req.file.mimetype.startsWith('image/')) {
      const result = await uploadToCloudinary(req.file.buffer);
      if (!result) {
        throw new AppError('Error while uploading new image');
      }
      imgUrl = result.secure_url;

      if (result.public_id && req.session.user.image) {
        const deleteRes = await deleteFromCloudinary(req.session.user.image);
      }
    }

    const response = await auth.api.updateUser({
      body: {
        username,
        name,
        image: imgUrl,
      },
      headers: req.headers,
    });

    if (!response.status) {
      throw new AppError('Error while updating details', 500);
    }

    return res.status(200).json(new APIResponse('User details updated', 200));
  } catch (error) {
    console.error('updateUser :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function sendEmailVerificationOTP(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User needs to be logged in to verify email', 401);
    }

    if (req.session.user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    const response = await auth.api.sendVerificationOTP({
      body: {
        email: req.session.user.email,
        type: 'email-verification',
      },
    });

    if (!response.success) {
      throw new AppError('Error while sending email');
    }

    return res
      .status(200)
      .json(new APIResponse('Email verification OTP sent successfully', 200));
  } catch (error) {
    console.error('sendEmailVerificationOTP :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function verifyEmailVerificationOTP(req: Request, res: Response) {
  try {
    if (!req.body) {
      throw new AppError('Request body is empty', 400);
    }

    const { otp }: { otp: string } = req.body;
    if (!otp || otp.length !== 6) {
      throw new AppError('No or invalid OTP provided', 400);
    }
    if (!req.session) {
      throw new AppError('User needs to be logged in to verify email', 401);
    }

    if (req.session.user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    const { success: isOTPValid } = await auth.api.checkVerificationOTP({
      body: {
        email: req.session.user.email,
        otp,
        type: 'email-verification',
      },
    });

    if (!isOTPValid) {
      throw new AppError('OTP not valid', 400);
    }

    const response = await auth.api.verifyEmailOTP({
      body: {
        email: req.session.user.email,
        otp,
      },
    });

    if (!response.status) {
      throw new AppError('Error while verifying email');
    }

    return res
      .status(200)
      .json(new APIResponse('Email verified successfully', 200));
  } catch (error) {
    console.error('verifyEmailVerificationOTP :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function sendForgetPasswordOTP(req: Request, res: Response) {
  try {
    if (!req.body) {
      throw new AppError('Request body is empty', 400);
    }

    const { email } = req.body;

    if (!email) {
      throw new AppError('Email not provided', 400);
    }

    const emailExists = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (emailExists.length === 0) {
      throw new AppError('No user found with provided email', 404);
    }

    const response = await auth.api.forgetPasswordEmailOTP({
      body: {
        email: email,
      },
    });

    if (!response.success) {
      throw new AppError('Error while sending email');
    }

    return res
      .status(200)
      .json(new APIResponse('Forget email OTP sent successfully', 200));
  } catch (error) {
    console.error('sendForgetPasswordOTP :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function verifyForgetPasswordOTP(req: Request, res: Response) {
  try {
    if (!req.body) {
      throw new AppError('Request body is empty', 400);
    }

    const { otp, password, email } = req.body;
    if (!otp || otp.length !== 6) {
      throw new AppError('No or invalid OTP provided', 400);
    }

    if (!password || !email) {
      throw new AppError('No password or email provided', 400);
    }

    const { success: isOTPValid } = await auth.api.checkVerificationOTP({
      body: {
        email: email,
        otp,
        type: 'forget-password',
      },
    });

    if (!isOTPValid) {
      throw new AppError('OTP not valid', 400);
    }

    const response = await auth.api.resetPasswordEmailOTP({
      body: {
        otp,
        password,
        email,
      },
    });

    if (!response.success) {
      throw new AppError('Error while reseting password');
    }

    return res
      .status(200)
      .json(new APIResponse('Password reset successfully', 200));
  } catch (error) {
    console.error('verifyForgetPasswordOTP :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

export async function searchUsers(req: Request, res: Response) {
  try {
    if (!req.session) {
      throw new AppError('User needs to be logged in to perform search', 401);
    }
    const myId = req.session.user.id;
    const queryStr = (req.query.q as string || '').trim();

    if (!queryStr) {
      return res
        .status(200)
        .json(new APIResponse('Users searched successfully', 200, []));
    }

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
      })
      .from(user)
      .where(
        and(
          not(eq(user.id, myId)),
          or(
            ilike(user.name, `%${queryStr}%`),
            ilike(user.username, `%${queryStr}%`)
          )
        )
      )
      .limit(20);

    return res
      .status(200)
      .json(new APIResponse('Users searched successfully', 200, users));
  } catch (error) {
    console.error('searchUsers :: ', error);
    throw error instanceof AppError || error instanceof APIError
      ? error
      : new AppError();
  }
}

