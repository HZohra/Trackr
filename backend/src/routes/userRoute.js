import express from "express";
import * as userController from "../controllers/userController.js";
import { upload } from "../middleware/upload.js";
//import { verifyToken } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimit.js";

const router = express.Router();



// Dashboard page routes
router.get("/courses", userController.getCoursesByUserId);
router.get("/activities", userController.getActivitiesByUserId);
router.patch("/activities/:activityId/status", userController.setActivityStatus);
router.get("/statistics", userController.getStatisticsByUserId);

// Courses page + Calendar + GPA routes
router.get("/courses/:courseId", userController.getCourseById);
router.get(
    "/courses/:courseId/activities",
    userController.getActivitiesByUserIdAndCourseId,
);

router.delete("/courses/:courseId", userController.deleteCourseById);
router.patch("/courses/:courseId/archive", userController.setCourseArchive);
router.patch("/courses/:courseId/final-grade", userController.setCourseFinalGrade);
router.patch("/courses/:courseId", userController.updateCourseById);
// Adding an assignment / recording a grade / removing one, from the
// assignments page.
router.post("/activities", userController.addActivity);
router.put("/activities/:activityId", userController.updateActivityById);
router.delete("/activities/:activityId", userController.deleteActivityById);

// Upload syllabus routes + add course and activity routes.
// A real PDF begins with "%PDF-". The mimetype header is client-controlled and
// trivially spoofed, so confirm the actual bytes before doing any work.
const PDF_MAGIC = "%PDF-";

const uploadPdf = (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err) {
            return res
                .status(400)
                .json({ message: err.message || "File upload failed" });
        }
        if (
            req.file &&
            req.file.buffer.subarray(0, 5).toString("latin1") !== PDF_MAGIC
        ) {
            return res
                .status(400)
                .json({ message: "Uploaded file is not a valid PDF" });
        }
        next();
    });
};

router.post("/upload-syllabus", uploadLimiter, uploadPdf, userController.uploadSyllabus);
router.post("/courses/", userController.addCourse);

// Delete the currently logged-in user's account
router.delete("/account", userController.deleteCurrentUserAccount);

router.put("/change-password", userController.changePassword);

// Profile page routes
router.get("/:id/profile", userController.getProfileById);
router.put("/:id/profile", userController.updateProfileById);

export default router;
