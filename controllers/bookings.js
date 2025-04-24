const Booking = require('../models/Booking');
const Hotel =  require('../models/Hotel');

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Public
exports.getBookings = async (req, res, next) => {
    let query;
    // General users can see only their Bookings!
    if (req.user.role !== 'admin') {
        query = Booking.find({ user: req.user.id }).populate({
            path: 'hotel',
            select: 'name province tel'
        });
    } else { 
        // If you are an admin, you can see all!
        if(req.params.hotelId){
            console.log(req.params.hotelId);
            query = Appointment.find({hospital: req.params.hotelId}).populate({
                path: 'hotel',
                select: 'name province tel'
            });

        }else{
            query = Booking.find().populate({
                path: 'hotel',
                select: 'name province tel'
            });
        }

    }
    
    try {
        const bookings = await query;

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot find Booking"
        });
    }
};

//@desc Get single booking
//@route GET /api/v1/bookings/:id
//@access Public
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id).populate({
            path: 'hotel',
            select: 'name description tel'
        });

        if (!booking) {
            return res.status(404).json({success: false, message: `No booking with the id of ${req.params.id}`});
        }

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot find Booking"
        });
    }
};

//@desc      Add booking
//@route     POST /api/v1/hotels/:hotelId/booking
//@access    Private
exports.addBooking = async (req, res, next) => {
    try {
        // Set hotel ID from params
        req.body.hotel = req.params.hotelId;

        // Validate hotel exists
        const hotel = await Hotel.findById(req.params.hotelId);
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: `No hotel found with the id of ${req.params.hotelId}`
            });
        }

        // Set user from token
        req.body.user = req.user.id;

        // Validate check-in and check-out dates
        const checkIn = new Date(req.body.checkInDate);
        const checkOut = new Date(req.body.checkOutDate);

        if (!checkIn || !checkOut || checkOut <= checkIn) {
            return res.status(400).json({
                success: false,
                message: "Invalid check-in/check-out dates"
            });
        }

        const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
        if (nights > 3) {
            return res.status(400).json({
                success: false,
                message: "You can only book up to 3 nights"
            });
        }

        // Enforce max 3 bookings for regular users
        const existingBookings = await Booking.find({ user: req.user.id });
        if (existingBookings.length >= 3 && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `User ${req.user.id} already made 3 bookings`
            });
        }

        // Create booking
        const booking = await Booking.create(req.body);

        res.status(201).json({
            success: true,
            data: booking
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Cannot create booking"
        });
    }
};

//@desc      Update booking
//@route     PUT /api/v1/bookings/:id
//@access    Private
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking found with ID ${req.params.id}`
            });
        }

        // Only owner or admin can update
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this booking`
            });
        }

        // ✅ Validate updated dates (if they are being changed)
        const { checkInDate, checkOutDate } = req.body;
        if (checkInDate && checkOutDate) {
            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkOutDate);

            if (checkOut <= checkIn) {
                return res.status(400).json({
                    success: false,
                    message: "Check-out date must be after check-in date"
                });
            }

            const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
            if (nights > 3) {
                return res.status(400).json({
                    success: false,
                    message: "You can only book up to 3 nights"
                });
            }
        }

        // ✅ Update booking
        booking = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            success: true,
            data: booking
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Cannot update booking"
        });
    }
};


//@desc      Delete booking
//@route     DELETE /api/v1/bookings/:id
//@access    Private
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure the user is the booking owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({success: false, message: `User ${req.user.id} is not authorized to delete this booking`});
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Cannot delete booking"
        });
    }
};
