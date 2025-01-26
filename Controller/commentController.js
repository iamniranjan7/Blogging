const mysql = require("mysql2/promise");
const sendMsg = require("../Utils/sendMessages");
const moment = require("moment");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

  exports.getComments = async (req, res) => {
  try {
    if (!req.user) {
      //  return sendMsg.throwsError(`Your'e not logged in`, 400);
    }
    // const { blog_id,loadCount } = req.body;
    const blog_id = req.params.blog_id;
    let loadCount = parseInt(req.query.loadCount);
   /* const q = `select c.*, u.username as message_by,u.profilePicture,u.id from comment_system as c 
                    left join user as u 
                    on c.user_id = u.id
                    where c.blog_id = ?
                    order by c.message_on desc limit 5 offset ? `;*/

     const q = `SELECT c.*, u.username as message_by,u.profilePicture, COUNT(sc.row_id) AS sub_comment_count,u.id
                FROM comment_system as c
                LEFT JOIN user as u ON u.id = c.user_id
                LEFT JOIN sub_comment_system as sc 
                ON sc.reply_id = c.reply_id AND sc.blog_id = c.blog_id
                WHERE c.blog_id = ? 
                GROUP BY c.reply_id, c.message, c.user_id, u.username
                order by c.message_on desc LIMIT 5 OFFSET ?`;

    const [result] = await pool.query(q, [blog_id, loadCount]);
    const results = result.map((item) => {
      return {
        ...item,
        message_time: moment(item.message_on).fromNow(),
      };
    });
    sendMsg.successMessage("Success", { result: results }, res, 200);
  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
};

//reply_id, message, user_id, blog_id, row_id, message_on, to_whom
//'36', 'this is first sub comment', '1', '31', '1', '2024-07-08 20:47:19', '2'
exports.getSubComments = async (req, res) => {
  try {
    const { blog_id, reply_id } = req.params;
    const q = `
        select
        sc.reply_id,sc.message,
        sc.blog_id,sc.row_id as reply_row_id,sc.message_on,
        sc.user_id as from_id,
        u.username as from_username,u.profilePicture as from_pic,
        su.username as to_username,su.profilePicture as to_pic,
        su.id as to_id
        from sub_comment_system as sc
        left join user as u on sc.user_id = u.id
        left join user as su on sc.to_whom = su.id
        where sc.blog_id = ? and sc.reply_id = ?
        order by sc.message_on desc`;
    const [result] = await pool.query(q, [blog_id, reply_id]);
    const nResults = result.map((item) => {
      return {
        ...item,
        message_time: moment(item.message_on).fromNow(),
      };
    });
    sendMsg.successMessage("Success", { result: nResults }, res, 200);
  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
};

exports.postComment = async (req, res) => {
  try {
    if (!req.user) {
      return sendMsg.throwsError(`Your'e not logged in`, 400);
    }
    const { blog_id, message } = req.body;
    const q = `insert into comment_system 
                   (blog_id, user_id,message, message_on)
                   value (?,?,?,now())`;

    const [result] = await pool.query(q, [blog_id, req.user.id, message]);
    return sendMsg.successMessage(`Your'e message is posted!!`, [], res, 200);
  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
};

exports.postSubComment = async (req, res) => {
  try {
    if (!req.user) {
      return sendMsg.throwsError(`Your'e not logged in`, 400);
    }
      const { to_id, blog_id, reply_id, message } = req.body;
      //console.log(message);
      const q =
          ` insert into sub_comment_system
           (reply_id,message,user_id,blog_id,message_on,to_whom)
           value(?,?,?,?,now(),?)`;

      const [result] = await pool.query(q, [reply_id, message, req.user.id, blog_id, to_id]);
      return sendMsg.successMessage(`Your'e message is posted!!`, [], res, 200);
  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
};

exports.getCommentCount = async (req, res) => {
  try {
    const {blog_id} = req.params;
    const q = `SELECT count(c.blog_id) as comment_count FROM blogs as b
left join comment_system as c on c.blog_id = b.blog_id
 WHERE b.delete_blog = FALSE AND b.available_to = "public" and b.blog_id = ?
 group by b.blog_id,b.blog
 ORDER BY b.created_at DESC `;
    const [result] = await pool.query(q, [blog_id]);
    //console.log(result);
    if (result.length) {
          return sendMsg.successMessage(`Success`, result, res, 200);

    } else {
          return sendMsg.successMessage(`Success`, [{comment_count:0}], res, 200);

    }

  } catch (err) {
   sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
}

exports.getLikes = async (req, res) => {
  try {
    const q = `select ifnull(sum(liked),0) as likeCount from likes where blog_id = ?`;
    const { blog_id } = req.params;
    const [result] = await pool.query(q, [blog_id]);
    sendMsg.successMessage("success", result, res, 200);
  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
}

// to get individual liked status of user for blog
// select * from likes where blog_id = 31 and liked_by_id = 2 order by message_on desc limit 1;

exports.getIndiBlogLike = async (req,res) => {

  try {
    const { blog_id } = req.params;
    const [result] = await pool.query(
      `select likes from blogs where blog_id = ?`,
      [blog_id]
    );

    //console.log(result)
    // if (result.length) {
    //   console.log(result);
    // } else {
    //   console.log(result.length);
    // }  
      sendMsg.successMessage("success", result, res, 200);


  } catch (err) {
    sendMsg.errMessage(err.message, err, res, err.statusCode);

  }
  
}

exports.postLike = async (req, res) => {
  try {
    if (!req.user) {
      return sendMsg.successMessage(`Your'e not logged in!!`, [], res, 200);
    }
    const { blog_id } = req.body;

    const q = `select * from likes where blog_id = ? and liked_by_id = ? order by row_id desc limit 1`;
    const [result] = await pool.query(q,[blog_id,req.user.id]);
    let like = 0;
    // if (result[0] === undefined || result[0].liked === 0 || (result[0].liked === -1 && result[0].liked !== 1)) {
    //   like = 1;
    // } else if (result[0].liked === 1 && result[0].liked !== -1 && result[0].liked !== 0) {
    //   like = -1;
    // }
    //console.log(result);
    if (result[0] && result[0].liked !== -1 && result[0].liked !== 0) {
      like = -1;
    }
    
    if(result[0] === undefined || result[0].liked !== 1){
      like = 1;
    }
    //console.log(like);
    //insert into likes(liked,liked_by_id,blog_id,message_on) value (1,2,32,now());
     const pq = `insert into likes(liked, liked_by_id,blog_id, message_on) value (?,?,?,FROM_UNIXTIME(?/1000))`;
    const [postRes] = await pool.query(pq, [like, req.user.id, blog_id, Date.now()]);
    // console.log(postRes);
    //console.log("like is posted", like);

    return sendMsg.successMessage("success", result, res, 200);
  } catch (err) {
    return sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
}


exports.allBlogLikeStatus = async (req, res) => {
  try {
    let user = -1;
    //console.log(req.user);
    if (req.user) {
      user = req.user.id;
    }
    let q = `select blog_id,sum(liked) as liked,liked_by_id from likes
               where liked_by_id = ? group by blog_id,liked_by_id`;
    
    const [result] = await pool.query(q, [user]);
    return sendMsg.successMessage("success", result, res, 200);

  } catch (err) {
    return sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
}


exports.getFriendBlogCommentCount = async (req, res) => {
  try {
    const { blog_id } = req.params;
    const q = `select count(reply_id) as comment_count from comment_system where blog_id = ? group by blog_id`;
    const [result] = await pool.query(q, blog_id);
    return sendMsg.successMessage("success", result, res, 200);
  } catch (err) {
    return sendMsg.errMessage(err.message, err, res, err.statusCode);
  }
}