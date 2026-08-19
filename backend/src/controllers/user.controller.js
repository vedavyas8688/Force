import * as userService from "../services/users/user.service.js";

export async function listUsersHandler(req, res, next) {
  try {
    const users = await userService.listUsers({ organizationId: req.organizationId });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

export async function inviteUserHandler(req, res, next) {
  try {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: "Missing name, email, or role" });
    }

    const result = await userService.inviteUser({
      organizationId: req.organizationId,
      name,
      email,
      role,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function acceptInviteHandler(req, res, next) {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ error: "Missing email, OTP, or password" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await userService.acceptInvite({ email, otp, password });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function removeUserHandler(req, res, next) {
  try {
    const removed = await userService.removeUser({
      organizationId: req.organizationId,
      actorUserId: req.user.sub,
      userId: req.params.id,
    });

    res.json({ removed });
  } catch (err) {
    next(err);
  }
}
