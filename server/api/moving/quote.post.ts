import { handleMovingSubmission } from "../../submissions/handler";

export default defineEventHandler((event) => handleMovingSubmission(event, "quote"));
