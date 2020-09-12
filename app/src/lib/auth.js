module.exports = {
    isLoggedIn (req, res, next) {
        if (req.user) {
        //  console.log("registrado");
            return next();
        }
        //  console.log("NO registrado");
        return res.redirect('/login/google');
    }
};
