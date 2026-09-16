import * as adminModel from "../model/adminModel.js";

// Make admin page only for amins (no students)
const ROLES = ["student", "admin"];

export const getAllUsers = (req, res) => {
    const role = ROLES.includes(req.query.role) ? req.query.role : null;
    adminModel.getAllUsers(role, (err, users) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(users);
    });
};

export const getUser = (req, res) => {
    adminModel.getUserById(req.params.id, (err, users) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (!users[0]) return res.status(404).json({ message: "User not found" });
        res.json(users[0]);
    });
};

export const getAllCourses = (req, res) => {
    adminModel.getAllCourses((err, courses) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(courses);
    });
};

export const getCourse = (req, res) => {
    adminModel.getCourseById(req.params.id, (err, courses) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (!courses[0]) return res.status(404).json({ message: "Course not found" });
        res.json(courses[0]);
    });
};

export const getStatistics = (req, res) => {
    adminModel.getStatistics((err, statistics) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(statistics[0]);
    });
};

const ACTIVITY_FEED_LIMIT = 15;

export const getRecentActivity = (req, res) => {
    adminModel.getRecentActivity(ACTIVITY_FEED_LIMIT, (err, events) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(events);
    });
};

export const getAllUserActivities = (req, res) => {
    adminModel.getAllActivities((err, activities) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json(activities);
    });
};
