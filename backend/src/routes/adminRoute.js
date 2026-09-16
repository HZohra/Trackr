import express from "express";
import {
    getAllCourses,
    getAllUserActivities,
    getAllUsers,
    getCourse,
    getRecentActivity,
    getStatistics,
    getUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/users/", getAllUsers);
router.get("/users/:id", getUser);
router.get("/courses/", getAllCourses);
router.get("/courses/:id", getCourse);
router.get("/statistics/", getStatistics);
router.get("/recent-activity/", getRecentActivity);
router.get("/user-activities/", getAllUserActivities);

export default router;
