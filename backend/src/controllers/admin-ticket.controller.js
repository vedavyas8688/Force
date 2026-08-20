import * as adminTicketService from "../services/admin/admin-ticket.service.js";

export async function globalTicketOverviewHandler(req, res, next) {
  try {
    const overview = await adminTicketService.getGlobalTicketOverview();
    res.json(overview);
  } catch (err) {
    next(err);
  }
}

export async function getGlobalTicketHandler(req, res, next) {
  try {
    const ticket = await adminTicketService.getGlobalTicket({
      ticketId: req.params.id,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function updateGlobalTicketStatusHandler(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Missing status" });
    }

    const ticket = await adminTicketService.updateGlobalTicketStatus({
      user: req.user,
      ticketId: req.params.id,
      status,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function addGlobalTicketCommentHandler(req, res, next) {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Missing comment" });
    }

    const ticket = await adminTicketService.addGlobalTicketComment({
      user: req.user,
      ticketId: req.params.id,
      body,
    });

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function addGlobalInternalNoteHandler(req, res, next) {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Missing internal note" });
    }

    const ticket = await adminTicketService.addGlobalInternalNote({
      user: req.user,
      ticketId: req.params.id,
      body,
    });

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function reviewGlobalReopenRequestHandler(req, res, next) {
  try {
    const { decision, adminNote } = req.body;
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Decision must be approved or rejected" });
    }

    const ticket = await adminTicketService.reviewGlobalReopenRequest({
      user: req.user,
      ticketId: req.params.id,
      requestId: req.params.requestId,
      decision,
      adminNote,
    });

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
}
