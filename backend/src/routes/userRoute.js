import express from "express";
import * as userController from "../controllers/userController.js";
import { upload } from "../middleware/upload.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Every route below this line requires a valid JWT.
// verifyToken attaches req.user = { user_id, role } from the token,
// so controllers should use req.user.user_id instead of trusting
// req.body.userId or req.params.id from the client.
router.use(verifyToken);

// Dashboard page routes
router.get("/courses", userController.getCoursesByUserId);
router.get("/activities", userController.getActivitiesByUserId);
router.get("/statistics", userController.getStatisticsByUserId);

// Courses page + Calendar + GPA routes
router.get("/courses/:courseId", userController.getCourseById);
router.get(
    "/courses/:courseId/activities",
    userController.getActivitiesByUserIdAndCourseId,
);

router.delete("/courses/:courseId", userController.deleteCourseById);

// Adding an assignment / recording a grade / removing one, from the
// assignments page.
router.post("/activities", userController.addActivity);
router.put("/activities/:activityId", userController.updateActivityById);
router.delete("/activities/:activityId", userController.deleteActivityById);

// Upload syllabus routes + add course and activity routes.
const uploadPdf = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res
                .status(400)
                .json({ message: err.message || "File upload failed" });
        }
        next();
    });
};
router.post("/upload-syllabus", uploadPdf, userController.uploadSyllabus);
router.post("/courses/", userController.addCourse);

// Delete the currently logged-in user's account
router.delete("/account", userController.deleteCurrentUserAccount);

// Profile page routes
router.get("/:id/profile", userController.getProfileById);
router.put("/:id/profile", userController.updateProfileById);

export default router;
