import { Router, type IRouter } from "express";
import healthRouter from "./health";
import datasetsRouter from "./datasets";
import recordsRouter from "./records";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(datasetsRouter);
router.use(recordsRouter);
router.use(chatRouter);

export default router;
