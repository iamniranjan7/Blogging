const mysql = require("mysql2/promise");
const moment = require("moment");

const errMessage = (msg, err, res, statusCode) => {
  this.statusCode = statusCode || 500;
  return res.status(this.statusCode).json({
    status: "failed",
    message: msg,
    err,
  });
};

const throwsError = (msg, statusCode) => {
  const error = new Error(msg);
  error.statusCode = statusCode || 500;
  error.st = error.stack;
  throw error;
};

const successMessage = (msg, result, res, statusCode) => {
  return res.status(statusCode).json({
    status: "success",
    message: msg,
    result,
  });
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const noContent = (res, result) => {
  if (!result.length) {
    throwsError(`There's no content`, 204);
  }
};

//to create blog
exports.createBlog = async (req, res) => {
  try {
    if (!req.user) {
      throwsError(`Your'e not logged in`, 400);
    }
    // console.log(req.body);
    const { blog, available_to, blog_head } = req.body;
    const q = `INSERT INTO blogs (blog_by,blog,available_to,created_at,bloogger_id,blog_head) VALUES (?,?,?,FROM_UNIXTIME(?/1000),?,?)`;

    const [result] = await pool.query(q, [
      req.user.username,
      blog,
      available_to,
      Date.now(),
      req.user.id,
      blog_head,
    ]);
    // console.log(result);
    successMessage("Successfully created an blog", result, res, 200);
  } catch (err) {
    console.log(err);
    errMessage(err.message, err, res, 400);
  }
};

exports.getBlogs = async (req, res) => {
  const { loadCount } = req.body;
  //const q = `SELECT * FROM blogs WHERE delete_blog = FALSE AND available_to = "public" ORDER BY created_at DESC LIMIT 7 OFFSET ?`;
  const q = `SELECT b.* ,count(c.blog_id) as comment_count FROM blogs as b
            left join comment_system as c on c.blog_id = b.blog_id
            WHERE b.delete_blog = FALSE AND b.available_to = "public"
            group by b.blog_id,b.blog
            ORDER BY b.created_at DESC LIMIT 7 OFFSET ?`;
  try {
    const [result] = await pool.query(q,[loadCount]);
    // noContent(res, result);
    // const timeAgo = moment(result.created_at).fromNow();
    const re = result.map(item => {
      return {
        ...item,
        created_time_ago: moment(item.created_at).fromNow()
      }
    });
    // console.log(re);
    successMessage(
      "Successfully loaded all blogs",
      { result: re, results: result.length },
      res,
      200
    );
  } catch (err) {
    errMessage(err.message, err.stack, res, 400);
  }
};

exports.deleteBlog = async (req, res) => {
  const { blog_id } = req.body;
  const q = `UPDATE blogs
             SET delete_blog = true
             WHERE blog_id = ? AND delete_blog = false`;

  try {
    await pool.query(q, [blog_id]);
    successMessage("successfully deleted the blog", [], res, 203);
  } catch (err) {
    errMessage(err.message, err, res, 400);
  }
};

exports.getMyBlogs = async (req, res) => {
  try {
    if (req.user) {
      const q = `SELECT * FROM blogs WHERE bloogger_id = ? AND delete_blog = false`;
      const [result] = await pool.query(q, [req.user.id]);
      const newResult = result.map(item => {
        return {
          ...item,
          created_time_ago: moment(item.created_at).fromNow()
        }
      });
     // console.log(newResult);

      if (!result.length) {
        return successMessage("No posts", [], res, 200);
      }
      return successMessage("Success", {result:newResult}, res, 200);
    } else {
      return throwsError(`Your'e not logged in`, 203);
    }
  } catch (err) {
    console.log(err);
    errMessage(err.message, err, res, err.statusCode);
  }
}

exports.getUserBlogs = async (req, res) => {
    try {
      const { id } = req.params;
        let q = `SELECT * FROM blogs WHERE bloogger_id = ? AND delete_blog = false AND available_to = "public"`;
      if (req.user && id === req.user.id) {
        q = `SELECT * FROM blogs WHERE bloogger_id = ? AND delete_blog = false AND available_to = "public"`;
      }
        const [result] = await pool.query(q, [id]);
        if (!result.length) {
          return successMessage("No posts", [], res, 200);
      }
      
      const createdOn = result.map(item => {
        return {
          ...item,
          created_on: moment(item.createdAt).format("MMM Do YY")
        }
      })
      //console.log(createdOn);
        return successMessage("Success", {result:createdOn}, res, 200); 
    } catch (err) {
      console.log(err);
      errMessage(err.message, err, res, err.statusCode);
    }
}


//handler is done //ui to be finished later
exports.getFriendsPublicPrivateBlog = async (req, res) => {
  try {
    if (!req.user) {
      throwsError(`Your'e not logged in`, 400);
    }
  const loadCount = parseInt(req.query.loadCount);
    const q = `select b.likes,b.blog_id,u.username,u.id as friend_id,b.blog,b.blog_head,b.bloogger_id,b.available_to,b.created_at from friends as f 
              left join user as u on f.user_id1 = u.id or f.user_id2 = u.id left join blogs as b on u.id = b.bloogger_id
              where (f.user_id1 = ? or f.user_id2 = ?) and not (u.id = ?) and blog is not null and b.delete_blog = 0
              order by b.created_at desc limit 5 offset ?`;
    const [result] = await pool.query(q, [
      req.user.id,
      req.user.id,
      req.user.id,
      loadCount,
    ]);
    const blogsWithTime = result.map(item => {
      return {
        ...item,
        created_time: moment(item.created_at).fromNow()
      }
    })

    return successMessage("Success", { results: result.length, result:blogsWithTime}, res, 200);
  } catch (err) {
         console.log(err);
         errMessage(err.message, err, res, err.statusCode);
  }
}

