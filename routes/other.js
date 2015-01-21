var mongoose = require('mongoose');
var Users    = mongoose.model('Users');
var Challenges = mongoose.model('Challenges');
var Notifications = mongoose.model('Notifications');
var core     = require('../core.js');

/*
Shows number of registered users, projects and ideas.
Get user info if logged in.
*/
exports.index = function(req, res) {
  var uid = ((req.session.auth) ? req.session.auth.github.user.id : null);
  var _self = {};

  Users.count().exec(gotUsers);

  function gotUsers(err, users) {
    _self.users = users;
    Users.findOne({'user_id': uid}).exec(render);
  };

  // Count all the PRs created and the number of lines of code touched
  // in all challenges.
  Challenges.find().exec(getStatistics);

  function getStatistics(err, ch) {
    _self.lines = 0;
    _self.pulls = 0;
    for (var r in ch) {
      for (var i in ch[r].pulls) {
        _self.lines += (ch[r].pulls[i].lines_inserted + ch[r].pulls[i].lines_removed);
      };
      _self.pulls += ch[r].created;
    };
  };

  function render(err, user) {
    res.render('index', {
      title:    "ROSEdu Challenge",
      user:     user,
      users:    _self.users,
      pulls:    0,
      lines:    0
    });
  }
};


/*
Login with or without GitHub auth.
This will provide a session and create a new user if necessary.
Visit /login/$USER to login as $USER.
*/
exports.login = function(req, res) {
  // Use an offline account. Add user if not existent.
  if (global.config.status == 'dev') {
    if (!req.params.user) {
      // If no username provided, redirect to default.
      return res.redirect('/login/dev_user');

    } else {
      // Create default user with given name and autogenerated id.
      var u = {id: parseInt(req.params.user, 36), login: req.params.user};

      // Add some content for user
      var repo = {
        name:           req.params.user + '\'s cool repo',
        description:    'A very nice description should be added here.',
        html_url:       'http://www.github.com',
        fork:           true,
        forks_count:    3,
        watchers_count: 5,
        closed_pulls:   3,
      };
      var update = {
        user_id:       u.id,
        user_name:     u.login,
        user_fullname: 'Development user',
        user_email:    'dev@github-connect.com',
        avatar_url:    'https://avatars.githubusercontent.com/u/0',
        location:      'Somewhere',
        repos:         [repo]
      };

      // Make sure user exists and build session for him.
      Users.update({user_id: u.id}, update, {upsert: true}, function(err, num) {
        req.session.regenerate(function (err) {
          req.session.auth = {};
          req.session.auth.loggedIn = true;
          req.session.auth.github = {};
          req.session.auth.github.user = u;
          res.redirect('/' + u.login);
        });
      });
    }

  // Load login or redirect user to profile page if already logged in.
  } else {
    if (req.session.auth)
      return res.redirect('/' + req.session.auth.github.user.login);

    res.render('login', {
      'title':  "Log in",
      'status': global.config.status,
      'tab':    req.query.rf
    });
  }
};


/*
Feedback form processing.
Sends email to owner and redirects to login page with message.
*/
exports.feedback = function(req, res) {
  if (req.body.email && req.body.msg) {
    core.send_mail(null, 'feedback', req.body);
    res.redirect('/login?rf=back');

  } else {
    res.redirect('/contact');
  }
};


/*
Coantact page holds feedback form.
*/
exports.contact = function(req, res) {
  var uid = ((req.session.auth) ? req.session.auth.github.user.id : null);

  Users.findOne({ user_id: uid }, function(err, user) {
    if (err) return handleError(err);

    res.render('contact', {
      title:  "Get in touch with us",
      user:   user
    });
  });
};


/*
FAQ page.
*/
exports.faq = function(req, res) {
  var uid = ((req.session.auth) ? req.session.auth.github.user.id : null);

  Users.findOne({ user_id: uid }, function(err, user) {
    if (err) return handleError(err);

    res.render('faq', {
      title:  "F.A.Q.",
      user:   user
    });
  });
};
