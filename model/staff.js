let mongoose = require("mongoose");

let Schema = mongoose.Schema;

let StaffSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full Name is Required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is Required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
      }
    },
    phone: {
      type: String,
      required: [true, "Phone Number is Required"],
      unique: true,
      validate: {
        validator: function(v) {
          return /^[0-9]{12}$/.test(v.replace(/\s/g, ''));
        },
        message: 'Phone must be 12 digits'
      }
    },
    password: {
      type: String,
      required: [true, "Password is Required"],
      minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: [true, "Role is Required"],
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Add indexes for better performance
StaffSchema.index({ email: 1 });
StaffSchema.index({ phone: 1 });
StaffSchema.index({ isDeleted: 1 });

let STAFF = mongoose.model("Staff", StaffSchema);
module.exports = STAFF;
