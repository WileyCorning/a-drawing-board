window.components = window.components || {};

var AttachDownTile = React.createClass({
  startDrag: function(event){
    event.dataTransfer.setData('text/plain',JSON.stringify({type:'fromContent',post_id:this.props.down.post_id}));
  },
  render: function() {
    return(
      <div className="post-container">
        <a
          className="post"
          id={'p'+this.props.down.post_id}
          href={'/p/'+this.props.down.post_id}
          draggable={true}
          onDragStart={this.startDrag}
        >
          <img
            className='content'
            src={'/i/'+this.props.down.post_id+'.png'}
          />
        </a>
          <div className='tile-info-icons'>
            {this.props.type==0 ? <i className='fa fa-reply fa-lg'/> : <i className='fa fa-paperclip fa-lg'/>}
          </div>
      </div>
    );
  }
});

var ReplyButton = React.createClass({
  handleClick: function(e) {
    window.CurrentPostParent = this.props.target;
    $('#input-overlay').css('display','block');
  },
  render: function() {
    return(
      <div id='input-open-container' className='post-container'>
        <a id='input-open-button' href='#' onClick={this.handleClick}>
          <i className='fa fa-pencil'/>
        </a>
      </div>
    );
  }
});



window.components.PostList = React.createClass({
  allowDrag: function(event){
    event.preventDefault();
  },
  receiveDrag: function(event){
    event.preventDefault();
    var data = JSON.parse(event.dataTransfer.getData('text/plain'));
    if(data.type==='fromFavorites'){
      socket.emit('createAttachment', {
          user_id: data.user_id,
          up: this.props.up,
          down: {post_id: data.post_id}
        });
    }
  },
  addPost: function(post){
    var _posts = this.state.posts;
    _posts.unshift(post);
    this.setState({posts:_posts});
  },
  getInitialState: function() {
    return {posts: []};
  },
  componentDidMount: function() {
    var self = this;

    var subscriptor = JSON.stringify(this.props.up);

    socket.expectReply('subscribeToNewAttachments',{up:self.props.up}).then(
      function(docs){
        self.setState({posts:docs.reverse()});
        console.log(subscriptor+":newAttachment");
        socket.on(subscriptor+':newAttachment',function(msg){
          console.log("Received",msg);
          self.addPost(msg);
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
        <AttachDownTile {...post} user_id={self.props.user_id} key={post.attach_id}/>
      );
    });
    return(
      <div className={'postList'} onDragOver={self.allowDrag} onDrop={self.receiveDrag}>
        {this.props.allow_replies && <ReplyButton target={this.props.up}/>}
        {tiles}
      </div>
    );
  }
});
