import * as authService from "../services/auth/auth.service.js";

export async function signupHandler(req, res, next) {
  try {
    const { organizationName, name, email, phone } = req.body;

    if (!organizationName || !name || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await authService.signup({ organizationName, name, email, phone });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const result = await authService.login({ email, password });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Missing refresh token" });
    }

    const result = await authService.refresh({ refreshToken });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyOtpHandler(req, res, next) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Missing email or OTP" });
    }

    const result = await authService.verifyLoginOtp({ email, otp });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req, res, next) {
  try {
    await authService.logout({ userId: req.user.sub });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req, res, next) {
  try {
    const user = await authService.getCurrentUser({ userId: req.user.sub });
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
