const passport = require('passport');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../Models/user');
const config = require('../config/db');
const session = require('express-session');
const nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');


router.post('/register', (req, res) => {
    var newAdmin = new Admin({
        nom:req.body.nom,
        prenom: req.body.prenom,
        email:req.body.email,
        password: req.body.password
    });

    Admin.addAdmin(newAdmin, (err,user) => {
        
        if (err) {
            let message = "";
            if (err.errors.password) message = "password est déja utilisé. ";
            if (err.errors.email) message = "Adresse mail est déja utilisée.";
            return res.json({
                success: false,
                message
            });
        } else {
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'your email',
                  pass: "your pass"
                }
              });
              var mailOptions = {
                from: 'your email',
                to: req.body.email,
                subject: ' Mail De Bienvenue',
                html: "<p> Bonjour   "+ (req.body.nom) + ",<br> <p> Bienvenue  <B> <br><p> Vos infomrations de Login sont : <br><p> Email :  " +" "+ req.body.email +"<br><p> Mot De Passe : "+" "+ req.body.password
              };
              transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
            return res.json({
                success: true,
                message: "Formateur registration is successful."
            });
        }
    });
});


router.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    sess = req.session;
	  sess.email = req.body.email; 
    // console.log(sess);

    Admin.getAdminByEmail(email, (err, admin) => {
        if (err) throw err;
        if (!admin) {
            return res.json({
                success: false,
                message: "Admin non trouvé."
            }); 
        }
 
        Admin.comparePassword(password, admin.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                const token = jwt.sign({
                    type: "admins",
                    data: {
                        _id: admin._id,
                        password:admin.password,
                        email: admin.email ,
                    }
                }, config.secret, {
                    expiresIn: 604800 // le token expire 
                });

                return res.json({
                    success: true,
                    token: token
                });
            } else {
                return res.json({
                    success: false,
                    message: "mot de passe erroné."
                });
            }
        });
    });
});




router.get('/logout',(req,res) => {
	req.session.destroy((err) => {
		if(err) {
			return console.log(err);
		}
		res.redirect('/');
		// console.log(sess);
	});
 

});

router.get('/profile', passport.authenticate('jwt', {
    session: true
}), (req, res) => {
    sess = req.session;
	if(sess.username) {
    // console.log(req.user);
    return res.json(
        req.user
        );
    }
});
router.delete("/delete/:id", (req, res, next) => {
  Admin.deleteOne({ _id: req.params.id }).then(result => {
   // console.log(result);
    res.status(200).json({ message: "User a été supprimé avec succés!" });
  });
});



router.get('/getAdminById/:id', (req, res ) => {
    Admin.find( { _id: req.params.id },(err, docs) => {
        if (!err) { res.send(docs); }
        else { console.log('Erreur  :' + JSON.stringify(err, undefined, 2)); }
    });
});

router.get('/getAllAdmins', (eq, res) => {
    Admin.find((err, docs) => {
        if (!err) { res.send(docs); }
        else { console.log('Erreur :' + JSON.stringify(err, undefined, 2)); }
    });
});


router.put('/updateAdminById/:id',(req, res) =>{
    let _id = req.params.id;

    Admin.findById(_id)
        .then(admin => {

            admin.email = req.body.email;
            admin.password = req.body.password;
            admin.save()
                .then(post => {
                    res.send({message: 'Admin a été modifié avec succés ', satus:'success',admin: admin})
                })
                .catch(err => console.log(err))
        })
        .catch(err => console.log(err))


})


router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        Admin.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
          //   console.log('error', 'No account with that email address exists.');
          req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  console.log('step 1')
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
          console.log('step 2')
  
  
        var smtpTrans = nodemailer.createTransport({
           service: 'Gmail', 
           auth: {
            user: 'your email',
            pass: 'your pass'
          }
        });
        var mailOptions = {
  
          to: user.email,
          from: 'your email',
          subject: 'Node.js Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
  
        };
        console.log('step 3')
  
          smtpTrans.sendMail(mailOptions, function(err) {
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          console.log('sent')
         // res.redirect('/forgot');
          res.status(200)
  });
  }
    ], function(err) {
      console.log('this err' + ' ' + err)
      //res.redirect('/');

    });
  });
  


router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        Admin.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user, next) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
  
  
          user.password = req.body.password;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          console.log('password' + user.password  + 'and the user is' + user)
  
  user.save(function(err) {
    if (err) {
        console.log('here')
         return res.redirect('back');
    } else { 
        console.log('here2')
      req.logIn(user, function(err) {
        done(err, user);
      });
  
    }
          });
        });
      },
  
  
  
  
  
      function(user, done) {
          // console.log('got this far 4')
        var smtpTrans = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'your email',
            pass: 'your password'
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'your email',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            ' - This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTrans.sendMail(mailOptions, function(err) {
          // req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/');
    });
  });
 
module.exports = router;