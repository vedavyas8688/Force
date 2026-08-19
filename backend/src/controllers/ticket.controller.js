import * as ticketService from "../services/tickets/ticket.service.js";

export async function listTicketsHandler(req, res, next) {
  try {
    const tickets = await ticketService.listTickets({
      organizationId: req.organizationId,
      user: req.user,
    });
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
}

export async function getTicketHandler(req, res, next) {
  try {
    const ticket = await ticketService.getTicket({
      organizationId: req.organizationId,
      user: req.user,
      ticketId: req.params.id,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function createTicketHandler(req, res, next) {
  try {
    const { projectId, title, description, priority } = req.body;

    if (!projectId || !title || !description) {
      return res.status(400).json({ error: "Missing project, title, or description" });
    }

    const ticket = await ticketService.createTicket({
      organizationId: req.organizationId,
      customerId: req.user.sub,
      projectId,
      title,
      description,
      priority,
    });

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function updateTicketStatusHandler(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    const ticket = await ticketService.updateTicketStatus({
      organizationId: req.organizationId,
      user: req.user,
      ticketId: req.params.id,
      status,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function addTicketCommentHandler(req, res, next) {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Missing comment" });
    }

    const ticket = await ticketService.addTicketComment({
      organizationId: req.organizationId,
      user: req.user,
      ticketId: req.params.id,
      body,
    });

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function assignTicketHandler(req, res, next) {
  try {
    const { developerId } = req.body;
    if (!developerId) {
      return res.status(400).json({ error: "Missing developer" });
    }

    const ticket = await ticketService.assignTicket({
      organizationId: req.organizationId,
      ticketId: req.params.id,
      developerId,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function autoAssignTicketHandler(req, res, next) {
  try {
    const { strategy } = req.body;

    const ticket = await ticketService.autoAssignTicket({
      organizationId: req.organizationId,
      ticketId: req.params.id,
      strategy,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function autoAssignUnassignedTicketsHandler(req, res, next) {
  try {
    const { strategy } = req.body;

    const tickets = await ticketService.autoAssignUnassignedTickets({
      organizationId: req.organizationId,
      strategy,
    });

    res.json({ assignedCount: tickets.length, tickets });
  } catch (err) {
    next(err);
  }
}
