const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Post = require('../../models/Post');
const User = require('../../models/User');
const Profile = require('../../models/Profile');

// @route POST api/posts
// @desc Create a post
// @access Private
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const user = await User.findById(req.user.id).select('-password');

    try {
      const newPost = new Post({
        user: req.user.id,
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
      });
      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route GET api/posts/
// @desc Get all posts
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find().sort({date: -1});
        res.json(posts); 
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error')
        
    }
});

// @route GET api/posts
// @desc Get all post
// @access Private
router.get('/:post_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.post_id);

        if(!post) {
            return res.status(404).json({msg: 'Post not found'})
        }
        res.json(post); 
        
    } catch (err) {
        console.error(err.message);
        if(err.kind === 'ObjectId') {
            return res.status(404).json({msg: 'Post not found'});
        }           

        res.status(500).send('Server Error');
    }
});

// @route DELETE api/posts/:id
// @desc Delete post by id
// @access Private
router.delete('/:post_id', auth, async (req, res) => {
    try {

        const post = await Post.findById(req.params.post_id);
        if(!post) {
            return res.status(404).json({msg: 'Post not found'});
        } 

        // check the user related to the post is the same user deleting the post
        if(post.user.toString() !== req.user.id) {
            return res.status(401).json({msg: 'User not authorized to delete this post'});
        }

        await post.remove();
        res.json({msg: 'Post has been removed'}); 
        
    } catch (err) {
        console.error(err.message);
        if(err.kind === 'ObjectId') {
            return res.status(404).json({msg: 'Post not found'});
        }   
        res.status(500).send('Server Error')
        
    }
});

// @route PUT api/posts/like/:post_id
// @desc Like post by id
// @access Private
router.put('/like/:post_id', auth, async (req, res) => {
    try {

        const post = await Post.findById(req.params.post_id);
        if(!post) {
            return res.status(404).json({msg: 'Post not found'});
        } 

        // check if the post has already been liked by a user
        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
            return res.status(400).json({msg: 'Post already liked'});
        }

        await post.likes.unshift({user: req.user.id});
        await post.save();
        return res.json(post.likes); 
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');     
    }
});

// @route PUT api/posts/unlike/:post_id
// @desc Unlike post by id
// @access Private
router.put('/unlike/:post_id', auth, async (req, res) => {
    try {

        const post = await Post.findById(req.params.post_id);
        if(!post) {
            return res.status(404).json({msg: 'Post not found'});
        } 

         // Check if the post has not yet been liked
        if (!post.likes.some((like) => like.user.toString() === req.user.id)) {
            return res.status(400).json({ msg: 'Post has not yet been liked' });
        }
        
        // remove the like
        post.likes = post.likes.filter(
            ({ user }) => user.toString() !== req.user.id
        );
  
        await post.save();
        return res.json(post.likes); 
        
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');     
    }
});

// @route    POST api/posts/comment/:post_id
// @desc     Comment on a post
// @access   Private
router.post('/comment/:post_id',
    [
        auth, [
            check('text', 'Text is required').notEmpty(),
        ]
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const user = await User.findById(req.user.id).select('-password');
        const post = await Post.findById(req.params.post_id);
  
        // name = name of user commenting and user = id of user commenting
        const newComment = {
          text: req.body.text,
          name: user.name,
          avatar: user.avatar,
          user: req.user.id
        };
  
        post.comments.unshift(newComment);
  
        await post.save();
  
        res.json(post.comments);
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    }
  );
  
  // @route    DELETE api/posts/comment/:post_id/:comment_id
  // @desc     Delete comment
  // @access   Private
  router.delete('/comment/:post_id/:comment_id', auth, async (req, res) => {
    try {
      const post = await Post.findById(req.params.post_id);
  
      // Pull out comment
      const comment = post.comments.find(
        (comment) => comment.id === req.params.comment_id
      );
      // Make sure comment exists
      if (!comment) {
        return res.status(404).json({ msg: 'Comment does not exist' });
      }
      // Check to ensure only user who posted the comment can delete it
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
  
      post.comments = post.comments.filter(
        ({ id }) => id !== req.params.comment_id
      );
  
      await post.save();
  
      return res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  });

module.exports = router;
