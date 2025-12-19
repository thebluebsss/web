require("dotenv").config({ quiet: true });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// Middleware - CẤU HÌNH CORS ĐÚng
app.use(
  cors({
    origin: [
      "https://frontend-thanh-long.firebaseapp.com",
      "https://frontend-thanh-long.web.app",
      "http://localhost:3000", // Cho phép test local
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

app.use(express.json());

// Kết nối MongoDB
mongoose
  .connect(
    "mongodb+srv://20225207:20225207@cluster0.tqz2rcb.mongodb.net/it4409"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Error:", err));

// Schema và routes giữ nguyên...
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Tên không được để trống"],
    minlength: [2, "Tên phải có ít nhất 2 ký tự"],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, "Tuổi không được để trống"],
    min: [0, "Tuổi phải >= 0"],
  },
  email: {
    type: String,
    required: [true, "Email không được để trống"],
    match: [/^\S+@\S+\.\S+$/, "Email không hợp lệ"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
});

const User = mongoose.model("User", UserSchema);

// API endpoints giữ nguyên...
app.get("/api/users", async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || "";
    if (page < 1) page = 1;
    if (limit < 1) limit = 5;
    if (limit > 100) limit = 100;

    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { address: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      page,
      limit,
      total,
      totalPages,
      data: users,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    let { name, age, email, address } = req.body;
    name = name?.trim();
    email = email?.trim().toLowerCase();
    address = address?.trim();
    age = parseInt(age);

    const newUser = await User.create({ name, age, email, address });

    res.status(201).json({
      message: "Tạo người dùng thành công",
      data: newUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Email đã tồn tại" });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }
    let { name, age, email, address } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (age !== undefined) updateData.age = parseInt(age);
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (address !== undefined) updateData.address = address.trim();

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      data: updatedUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: "Email đã tồn tại" });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID không hợp lệ" });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    res.json({ message: "Xóa người dùng thành công" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// SỬA PORT - QUAN TRỌNG!
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
