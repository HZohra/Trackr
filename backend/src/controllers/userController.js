import bcrypt from "bcrypt";

import * as activityModel from "../model/activityModel.js";
import * as courseModel from "../model/courseModel.js";
import * as userModel from "../model/userModel.js";

import { extractSyllabus } from "../services/extractor.js";

import { createToken } from "../middleware/auth.js";

import {
    isStrongPassword,
    PASSWORD_POLICY_MESSAGE,
} from "../utils/passwordPolicy.js";

import {
    normalizeExtraction,
    validateActivityPayload,
    validateCoursePayload,
    VALID_COURSE_COLORS,
} from "../services/syllabusNormalizer.js";


// ============================================================================
// CHANGE PASSWORD
// ============================================================================

// PUT /user/change-password
// Lets a logged-in user change their password by proving the current one.
export const changePassword = (req, res) => {
    const userId = req.user.user_id;

    const currentPassword = String(
        req.body?.currentPassword ?? "",
    );

    const newPassword = String(
        req.body?.newPassword ?? "",
    );

    if (
        !currentPassword ||
        !newPassword
    ) {
        return res.status(400).json({
            message:
                "Current and new password are required",
        });
    }

    if (
        !isStrongPassword(
            newPassword,
        )
    ) {
        return res.status(400).json({
            message:
                PASSWORD_POLICY_MESSAGE,
        });
    }

    userModel.getUserById(
        userId,
        async (err, user) => {
            if (err) {
                return res.status(500).json({
                    message:
                        "Server error",
                });
            }

            if (!user) {
                return res.status(404).json({
                    message:
                        "User not found",
                });
            }

            const match =
                await bcrypt.compare(
                    currentPassword,
                    user.password_hash,
                );

            if (!match) {
                return res.status(401).json({
                    message:
                        "Current password is incorrect",
                });
            }

            const newHash =
                await bcrypt.hash(
                    newPassword,
                    10,
                );

            userModel.updateUserPassword(
                userId,
                newHash,
                (err2, result) => {
                    if (err2) {
                        return res.status(500).json({
                            message:
                                "Failed to update password",
                        });
                    }

                    /*
                     * Bumping token_version kills the
                     * old token too.
                     *
                     * Issue a fresh token so this session
                     * stays signed in while other sessions
                     * are logged out.
                     */
                    const token =
                        createToken({
                            user_id:
                                userId,

                            role:
                                req.user.role,

                            token_version:
                                result
                                    ?.token_version ??
                                0,
                        });

                    return res
                        .status(200)
                        .json({
                            message:
                                "Password updated",

                            token,
                        });
                },
            );
        },
    );
};


// ============================================================================
// COURSES
// ============================================================================

// GET /user/courses
//
// req.user comes from verifyToken middleware.
// This is the trustworthy source of who is asking.
export const getCoursesByUserId = (
    req,
    res,
) => {
    const userId =
        req.user.user_id;

    /*
     * Archive finished courses first,
     * then return the updated list.
     *
     * A failed auto-archive is logged
     * by the model but does not block
     * the courses read.
     */
    courseModel.autoArchivePastCourses(
        userId,
        () => {
            courseModel.getCoursesByUserId(
                userId,
                (err, courses) => {
                    if (err) {
                        return res.status(500).json({
                            message:
                                "Server error",
                        });
                    }

                    return res.json(
                        courses,
                    );
                },
            );
        },
    );
};


// GET /user/courses/:courseId
export const getCourseById = (
    req,
    res,
) => {
    const { courseId } =
        req.params;

    courseModel.getCourseById(
        courseId,
        req.user.user_id,
        (err, course) => {
            if (err) {
                return res.status(500).json({
                    message:
                        "Server error",
                });
            }

            if (!course) {
                return res.status(404).json({
                    message:
                        "Course not found",
                });
            }

            return res.json(
                course,
            );
        },
    );
};


// GET /user/courses/:courseId/activities
export const getActivitiesByUserIdAndCourseId = (
    req,
    res,
) => {
    const { courseId } =
        req.params;

    activityModel.getActivitiesByCourseId(
        courseId,
        req.user.user_id,
        (err, activities) => {
            if (err) {
                return res.status(500).json({
                    message:
                        "Server error",
                });
            }

            return res.json(
                activities,
            );
        },
    );
};


// ============================================================================
// ACTIVITIES
// ============================================================================

// GET /user/activities
export const getActivitiesByUserId = (
    req,
    res,
) => {
    activityModel.getAllActivities(
        req.user.user_id,
        (err, activities) => {
            if (err) {
                return res.status(500).json({
                    message:
                        "Server error",
                });
            }

            return res.json(
                activities,
            );
        },
    );
};


// GET /user/statistics
export const getStatisticsByUserId = (
    req,
    res,
) => {
    activityModel.getStatisticsByUserId(
        req.user.user_id,
        (err, stats) => {
            if (err) {
                return res.status(500).json({
                    message:
                        "Server error",
                });
            }

            return res.json(
                stats,
            );
        },
    );
};


// Valid activity statuses.
const ACTIVITY_STATUSES = [
    "not_started",
    "in_progress",
    "submitted",
    "graded",
];


// PUT /user/activities/:activityId
export const updateActivityById = (
    req,
    res,
) => {
    const { activityId } =
        req.params;

    const { activity } =
        req.body;

    if (!activity) {
        return res.status(400).json({
            message:
                "Missing activity data",
        });
    }


    // ------------------------------------------------------------------------
    // NAME
    // ------------------------------------------------------------------------

    const activity_name =
        typeof activity.activity_name ===
            "string"
            ? activity.activity_name.trim()
            : "";

    if (!activity_name) {
        return res.status(400).json({
            message:
                "Assignment name is required",
        });
    }


    // ------------------------------------------------------------------------
    // COURSE
    // ------------------------------------------------------------------------

    const course_id =
        Number(
            activity.course_id,
        );

    if (
        !Number.isInteger(
            course_id,
        ) ||
        course_id < 1
    ) {
        return res.status(400).json({
            message:
                "A course is required",
        });
    }


    // ------------------------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------------------------

    const activity_category_id =
        Number(
            activity.activity_category_id,
        );

    if (
        ![
            1,
            2,
            3,
            4,
            5,
            6,
        ].includes(
            activity_category_id,
        )
    ) {
        return res.status(400).json({
            message:
                "Invalid category",
        });
    }


    // ------------------------------------------------------------------------
    // GRADE
    // ------------------------------------------------------------------------

    let grade =
        null;

    if (
        activity.grade !== null &&
        activity.grade !== undefined &&
        activity.grade !== ""
    ) {
        grade =
            Number(
                activity.grade,
            );

        if (
            !Number.isFinite(
                grade,
            ) ||
            grade < 0 ||
            grade > 100
        ) {
            return res.status(400).json({
                message:
                    "Grade must be a number between 0 and 100",
            });
        }
    }


    // ------------------------------------------------------------------------
    // WEIGHT
    // ------------------------------------------------------------------------

    let grading_weight =
        Number(
            activity.grading_weight,
        );

    if (
        !Number.isFinite(
            grading_weight,
        ) ||
        grading_weight < 0
    ) {
        grading_weight = 0;
    }

    if (
        grading_weight > 100
    ) {
        return res.status(400).json({
            message:
                "Weight must be between 0 and 100",
        });
    }


    // ------------------------------------------------------------------------
    // DUE DATE
    // ------------------------------------------------------------------------

    // Due date is optional.
    const due_date =
        activity.due_date
            ? String(
                  activity.due_date,
              ).replace(
                  "T",
                  " ",
              )
            : null;


    // ------------------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------------------

    const status =
        activity.status ??
        (
            grade != null
                ? "graded"
                : "not_started"
        );

    if (
        !ACTIVITY_STATUSES.includes(
            status,
        )
    ) {
        return res.status(400).json({
            message:
                "Invalid status",
        });
    }


    // ------------------------------------------------------------------------
    // INSTRUCTIONS + NOTES
    // ------------------------------------------------------------------------

    const instructions =
        typeof activity.instructions ===
            "string" &&
        activity.instructions.trim()
            ? activity.instructions
            : null;

    const notes =
        typeof activity.notes ===
            "string" &&
        activity.notes.trim()
            ? activity.notes
            : null;


    // ------------------------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------------------------

    activityModel.updateActivity(
        activityId,
        req.user.user_id,
        {
            course_id,
            activity_category_id,
            activity_name,
            due_date,
            grading_weight,
            grade,
            status,
            instructions,
            notes,
        },

        (err, updated) => {
            if (err) {
                if (
                    err.code ===
                    "23505"
                ) {
                    return res
                        .status(409)
                        .json({
                            message:
                                "An assignment with that name and date already exists in this course.",
                        });
                }

                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update activity",
                    });
            }

            if (!updated) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Activity not found",
                    });
            }

            return res.json(
                updated,
            );
        },
    );
};


// DELETE /user/activities/:activityId
export const deleteActivityById = (
    req,
    res,
) => {
    const { activityId } =
        req.params;

    activityModel.deleteActivity(
        activityId,
        req.user.user_id,
        (err, deleted) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to delete activity",
                    });
            }

            if (!deleted) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Assignment not found",
                    });
            }

            return res
                .status(204)
                .end();
        },
    );
};


// ============================================================================
// SYLLABUS
// ============================================================================

// POST /user/upload-syllabus
export const uploadSyllabus = async (
    req,
    res,
) => {
    if (!req.file) {
        return res.status(400).json({
            message:
                "No file uploaded",
        });
    }

    const {
        term,
        term_start,
        term_end,
    } = req.body;

    console.log(
        "Extracting syllabus:",
        req.file.originalname,
        req.file.size,
        "bytes | term:",
        term,
    );

    try {
        const raw =
            await extractSyllabus({
                pdfBuffer:
                    req.file.buffer,

                term,
                term_start,
                term_end,
            });

        if (
            raw.is_syllabus ===
            false
        ) {
            return res
                .status(422)
                .json({
                    message:
                        "This doesn't look like a course syllabus. Please upload your syllabus PDF, or add the course manually.",
                });
        }

        const result =
            normalizeExtraction(
                raw,
                {
                    term,
                },
            );

        return res
            .status(200)
            .json(
                result,
            );

    } catch (err) {
        console.error(
            "Syllabus extraction failed:",
            err.message,
        );

        return res
            .status(502)
            .json({
                message:
                    "Extraction failed. Please try again.",
            });
    }
};


// ============================================================================
// CREATE COURSE
// ============================================================================

// POST /user/courses
//
// Creates a course and, if provided,
// its activities in one transaction.
export const addCourse = (
    req,
    res,
) => {
    /*
     * Strict server-side validation
     * and normalization.
     */
    const {
        ok,
        errors,
        normalized,
    } =
        validateCoursePayload(
            req.body,
        );

    if (!ok) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid course data",

                errors,
            });
    }

    const {
        course,
        activities,
    } = normalized;

    courseModel.createCourseWithActivities(
        req.user.user_id,
        course,
        activities,
        (err, result) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to create course",
                    });
            }

            return res
                .status(201)
                .json(
                    result,
                );
        },
    );
};


// ============================================================================
// UPDATE COURSE
// ============================================================================

// PATCH /user/courses/:courseId
// Edit a course's details (owner only).
export const updateCourseById = (
    req,
    res,
) => {
    const { courseId } =
        req.params;

    const { course } =
        req.body;


    // ------------------------------------------------------------------------
    // BASIC REQUEST VALIDATION
    // ------------------------------------------------------------------------

    if (
        !course ||
        typeof course !==
            "object"
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Missing course data",
            });
    }


    const courseIdNumber =
        Number(
            courseId,
        );

    if (
        !Number.isInteger(
            courseIdNumber,
        ) ||
        courseIdNumber <= 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid course ID",
            });
    }


    /*
     * Copy the incoming object before
     * normalizing individual values.
     *
     * courseModel.updateCourse still
     * controls the final column whitelist.
     */
    const safeCourse = {
        ...course,
    };


    // ------------------------------------------------------------------------
    // GRADE GOAL VALIDATION
    // ------------------------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            safeCourse,
            "gpa_goal",
        )
    ) {
        const rawGoal =
            safeCourse.gpa_goal;

        if (
            rawGoal === null ||
            rawGoal === "" ||
            rawGoal === undefined
        ) {
            safeCourse.gpa_goal =
                null;
        } else {
            const goal =
                Number(
                    rawGoal,
                );

            if (
                !Number.isFinite(
                    goal,
                ) ||
                goal < 0 ||
                goal > 100
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Grade goal must be between 0 and 100.",
                    });
            }

            safeCourse.gpa_goal =
                goal;
        }
    }


    // ------------------------------------------------------------------------
    // COURSE COLOR VALIDATION
    // ------------------------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            safeCourse,
            "color_theme",
        )
    ) {
        const rawColor =
            safeCourse.color_theme;

        /*
         * null / empty removes the manually
         * selected color and lets the frontend
         * fall back to colorForCourse(courseId).
         */
        if (
            rawColor === null ||
            rawColor === undefined ||
            (
                typeof rawColor ===
                    "string" &&
                rawColor.trim() ===
                    ""
            )
        ) {
            safeCourse.color_theme =
                null;
        } else {
            if (
                typeof rawColor !==
                "string"
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Invalid course color.",
                    });
            }

            const normalizedColor =
                rawColor
                    .trim()
                    .toLowerCase();

            if (
                !VALID_COURSE_COLORS.has(
                    normalizedColor,
                )
            ) {
                return res
                    .status(400)
                    .json({
                        message:
                            "Invalid course color.",
                    });
            }

            safeCourse.color_theme =
                normalizedColor;
        }
    }


    // ------------------------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------------------------

    courseModel.updateCourse(
        courseIdNumber,
        req.user.user_id,
        safeCourse,

        (err, result) => {
            if (err) {
                if (
                    err.code ===
                    "23505"
                ) {
                    return res
                        .status(409)
                        .json({
                            message:
                                "You already have a course with that code and term.",
                        });
                }

                console.error(
                    "Update course error:",
                    err,
                );

                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update course",
                    });
            }

            if (
                !result ||
                !result.affectedRows
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Course not found",
                    });
            }

            return res
                .status(200)
                .json({
                    message:
                        "Course updated",
                });
        },
    );
};


// ============================================================================
// ADD ACTIVITY
// ============================================================================

// POST /user/activities
//
// Adds a single assignment to a course.
// This is the manual counterpart to the syllabus flow.
export const addActivity = (
    req,
    res,
) => {
    const { activity } =
        req.body;

    if (!activity) {
        return res
            .status(400)
            .json({
                message:
                    "Missing activity data",
            });
    }


    const courseId =
        Number(
            activity.course_id,
        );

    if (
        !Number.isInteger(
            courseId,
        ) ||
        courseId <= 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid activity data",

                errors: [
                    "course_id is required",
                ],
            });
    }


    const {
        ok,
        errors,
        normalized,
    } =
        validateActivityPayload(
            activity,
        );

    if (!ok) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid activity data",

                errors,
            });
    }


    /*
     * activities has no user_id.
     *
     * Ownership exists through the course,
     * so verify that the requested course
     * belongs to the authenticated user
     * before inserting anything.
     */
    courseModel.getCourseById(
        courseId,
        req.user.user_id,

        (err, course) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Server error",
                    });
            }

            if (!course) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Course not found",
                    });
            }


            activityModel.createActivity(
                courseId,
                normalized,

                (err, created) => {
                    if (err) {
                        /*
                         * Adding the same
                         * assignment twice
                         * is a client conflict,
                         * not a server failure.
                         */
                        if (
                            err.code ===
                                "ER_DUP_ENTRY" ||
                            err.code ===
                                "23505"
                        ) {
                            return res
                                .status(409)
                                .json({
                                    message:
                                        "That assignment already exists for this course on that due date.",
                                });
                        }

                        return res
                            .status(500)
                            .json({
                                message:
                                    "Failed to create activity",
                            });
                    }


                    /*
                     * createActivity echoes
                     * its normalized data.
                     *
                     * Fill in fields whose
                     * values come from DB defaults.
                     */
                    return res
                        .status(201)
                        .json({
                            ...created,

                            course_id:
                                courseId,

                            grade:
                                null,

                            status:
                                "not_started",
                        });
                },
            );
        },
    );
};


// ============================================================================
// PROFILE
// ============================================================================

// GET /user/:id/profile
//
// A user can only view their own profile.
// Admins use their separate admin routes.
export const getProfileById = (
    req,
    res,
) => {
    const { id } =
        req.params;

    if (
        Number(id) !==
        req.user.user_id
    ) {
        return res
            .status(403)
            .json({
                message:
                    "Not authorized to view this profile",
            });
    }

    userModel.getUserById(
        id,
        (err, user) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Server error",
                    });
            }

            if (!user) {
                return res
                    .status(404)
                    .json({
                        message:
                            "User not found",
                    });
            }

            const {
                password_hash,
                ...safeUser
            } = user;

            return res.json(
                safeUser,
            );
        },
    );
};


// PUT /user/:id/profile
export const updateProfileById = (
    req,
    res,
) => {
    const { id } =
        req.params;

    if (
        Number(id) !==
        req.user.user_id
    ) {
        return res
            .status(403)
            .json({
                message:
                    "Not authorized to edit this profile",
            });
    }


    const { profile } =
        req.body;

    if (!profile) {
        return res
            .status(400)
            .json({
                message:
                    "Missing profile data",
            });
    }


    userModel.updateUserProfile(
        id,
        profile,

        (err, updatedUser) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update profile",
                    });
            }

            return res.json(
                updatedUser,
            );
        },
    );
};


// ============================================================================
// DELETE ACCOUNT
// ============================================================================

export const deleteCurrentUserAccount = (
    req,
    res,
) => {
    const userId =
        req.user.user_id;

    const password =
        String(
            req.body?.password ??
                "",
        );


    if (!password) {
        return res
            .status(400)
            .json({
                message:
                    "Password is required to delete your account",
            });
    }


    userModel.getUserById(
        userId,
        async (err, user) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Server error",
                    });
            }

            if (!user) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Account not found.",
                    });
            }


            const match =
                await bcrypt.compare(
                    password,
                    user.password_hash,
                );


            if (!match) {
                return res
                    .status(401)
                    .json({
                        message:
                            "Incorrect password",
                    });
            }


            userModel.deleteUserById(
                userId,

                (err2, result) => {
                    if (err2) {
                        console.error(
                            "Delete account error:",
                            err2,
                        );

                        return res
                            .status(500)
                            .json({
                                message:
                                    "Failed to delete account.",
                            });
                    }


                    if (
                        !result ||
                        result
                            .affectedRows ===
                            0
                    ) {
                        return res
                            .status(404)
                            .json({
                                message:
                                    "Account not found.",
                            });
                    }


                    return res
                        .status(200)
                        .json({
                            message:
                                "Account deleted successfully.",
                        });
                },
            );
        },
    );
};


// ============================================================================
// DELETE COURSE
// ============================================================================

// DELETE /user/courses/:courseId
//
// Deletes a course only when it belongs
// to the authenticated user.
export const deleteCourseById = (
    req,
    res,
) => {
    const courseId =
        Number(
            req.params.courseId,
        );

    if (
        !Number.isInteger(
            courseId,
        ) ||
        courseId <= 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid course ID",
            });
    }


    courseModel.deleteCourseById(
        courseId,
        req.user.user_id,

        (err, result) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to delete course",
                    });
            }


            if (
                !result ||
                result
                    .affectedRows ===
                    0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Course not found",
                    });
            }


            return res
                .status(204)
                .end();
        },
    );
};


// ============================================================================
// ARCHIVE COURSE
// ============================================================================

// PATCH /user/courses/:courseId/archive
// body: { archived: boolean }
export const setCourseArchive = (
    req,
    res,
) => {
    const courseId =
        Number(
            req.params.courseId,
        );

    if (
        !Number.isInteger(
            courseId,
        ) ||
        courseId <= 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid course ID",
            });
    }


    const { archived } =
        req.body || {};


    if (
        typeof archived !==
        "boolean"
    ) {
        return res
            .status(400)
            .json({
                message:
                    "archived (boolean) is required",
            });
    }


    courseModel.setCourseArchived(
        courseId,
        req.user.user_id,
        archived,

        (err, result) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update course",
                    });
            }


            if (
                !result ||
                result
                    .affectedRows ===
                    0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Course not found",
                    });
            }


            return res
                .status(200)
                .json({
                    course_id:
                        courseId,

                    archived,
                });
        },
    );
};


// ============================================================================
// FINAL GRADE
// ============================================================================

// PATCH /user/courses/:courseId/final-grade
//
// body:
// {
//   final_grade: number | null
// }
//
// Sets or clears a manual final-grade override.
export const setCourseFinalGrade = (
    req,
    res,
) => {
    const courseId =
        Number(
            req.params.courseId,
        );

    if (
        !Number.isInteger(
            courseId,
        ) ||
        courseId <= 0
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid course ID",
            });
    }


    let { final_grade } =
        req.body || {};


    if (
        final_grade === null ||
        final_grade === undefined ||
        final_grade === ""
    ) {
        final_grade =
            null;
    } else {
        final_grade =
            Number(
                final_grade,
            );

        if (
            !Number.isFinite(
                final_grade,
            ) ||
            final_grade < 0 ||
            final_grade > 100
        ) {
            return res
                .status(400)
                .json({
                    message:
                        "final_grade must be 0–100, or null",
                });
        }
    }


    courseModel.setCourseFinalGrade(
        courseId,
        req.user.user_id,
        final_grade,

        (err, result) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update grade",
                    });
            }


            if (
                !result ||
                result
                    .affectedRows ===
                    0
            ) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Course not found",
                    });
            }


            return res
                .status(200)
                .json({
                    course_id:
                        courseId,

                    final_grade,
                });
        },
    );
};


// ============================================================================
// ACTIVITY STATUS
// ============================================================================

// PATCH /user/activities/:activityId/status
//
// Status-only safe update.
export const setActivityStatus = (
    req,
    res,
) => {
    const { activityId } =
        req.params;

    const status =
        req.body?.status;


    if (
        !ACTIVITY_STATUSES.includes(
            status,
        )
    ) {
        return res
            .status(400)
            .json({
                message:
                    "Invalid status",
            });
    }


    activityModel.setActivityStatus(
        activityId,
        req.user.user_id,
        status,

        (err, updated) => {
            if (err) {
                return res
                    .status(500)
                    .json({
                        message:
                            "Failed to update status",
                    });
            }


            if (!updated) {
                return res
                    .status(404)
                    .json({
                        message:
                            "Assignment not found",
                    });
            }


            return res
                .status(200)
                .json(
                    updated,
                );
        },
    );
};