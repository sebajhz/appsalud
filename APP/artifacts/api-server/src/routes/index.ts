import { Router, type IRouter } from "express";
import mapazappRouter from "../mapazapp/routes";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/mapazapp", mapazappRouter);

export default router;
