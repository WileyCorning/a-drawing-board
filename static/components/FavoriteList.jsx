window.components = window.components || {};

var FavoriteButton = React.createClass({
  handleClick: function(e) {
    socket.emit('createFavorite', {
        user_id: this.props.user_id,
        post_id: this.props.post_id
      });
  },
  render: function() {
    return(
      <a href='#' className='favorite-button' onClick={this.handleClick}>
        <i className='fa fa-star fa-lg'/>
      </a>
    );
  }
})

var UnfavoriteButton = React.createClass({
  handleClick: function(e) {
    socket.emit('removeFavorite', {
        user_id: this.props.user_id,
        post_id: this.props.post_id
      });
  },
  render: function() {
    return(
      <a href='#' className='unfavorite-button' onClick={this.handleClick}>
        <i className='fa fa-close fa-lg'/>
      </a>
    );
  }
})

var FavoriteTile = React.createClass({
  startDrag: function(event){
    event.dataTransfer.setData('text/plain',JSON.stringify({type:'fromFavorites',post_id:this.props.post_id,user_id:this.props.user_id}));
  },
  render: function(){
    window.QQQ = this;
    return(
      <div className="post-container">
        <a
          className="post"
          id={'p'+this.props.post_id}
          href={'/p/'+this.props.post_id}
          draggable={true}
          onDragStart={this.startDrag}
        >
          <img
            className='content'
            src={'/i/'+this.props.post_id+'.png'}
          />
        </a>
        {this.props.user_id && <UnfavoriteButton user_id={this.props.user_id} post_id={this.props.post_id}/>}
      </div>
    )
  }
});


window.components.FavoriteList = React.createClass({
  allowDrag: function(event){
    event.preventDefault();
  },
  receiveDrag: function(event){
    event.preventDefault();
    var data = JSON.parse(event.dataTransfer.getData('text/plain'));
    if(data.type==='fromContent'){
      socket.emit('createFavorite', {
          user_id: this.props.user_id,
          post_id: data.post_id
        });
    }
  },
  addPost: function(post){
    var _posts = this.state.posts;
    _posts.unshift(post);
    this.setState({posts:_posts});
  },
  removePost: function(post){
    var _posts = Array.filter(this.state.posts,function(elem){
      console.log(elem,post);
      return elem.post_id!==post.post_id;
    })
    this.setState({posts:_posts});
  },
  getInitialState: function() {
    return {posts: []};
  },
  componentDidMount: function() {
    var self = this;

    socket.expectReply('subscribeToNewFavorites',{user_id:self.props.user_id}).then(
      function(docs){
        self.setState({posts:docs.reverse()});
        socket.on(self.props.user_id+':favoriteAdded',function(msg){
          console.log("Received",msg);
          self.addPost(msg);
        });
        socket.on(self.props.user_id+':favoriteRemoved',function(msg){
          console.log("Received",msg);
          self.removePost(msg);
        });
      },
      function(err){
        alert(err);
      }
    );
  },
  render: function() {
    var self = this;
    var tiles = this.state.posts.map(function(post){
      return (
        <FavoriteTile {...post} user_id={self.props.user_id}/>
      );
    });
    return(
      <div id={'favorites-panel'} onDragOver={self.allowDrag} onDrop={self.receiveDrag}>
        <div>Favorites</div>
        {tiles}
      </div>
    );
  }
});
