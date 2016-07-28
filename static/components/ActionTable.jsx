window.components = window.components || {};

var ActionRow = React.createClass({
  render: function() {
    return(
      <tr>
        <td>
          {
            this.props.up.post_id
            ?
            <div className="post-container">
              <a className="post" id={'p'+this.props.up.post_id} href={'/p/'+this.props.up.post_id}>
                <img className='content' src={'/i/'+this.props.up.post_id+'.png'}/>
              </a>
            </div>
            :
            <div className='pageTile'>
              <a href='/' className='fa fa-home'/>
            </div>
          }
        </td>
        <td>
          <div className='attach-type-big'>
            {this.props.type==0 ? <i className='fa fa-reply fa-lg'/> : <i className='fa fa-paperclip fa-lg'/>}
          </div>
        </td>
        <td>
          <div className="post-container">
            <a className="post" id={'p'+this.props.down.post_id} href={'/p/'+this.props.down.post_id}>
              <img className='content' src={'/i/'+this.props.down.post_id+'.png'}/>
            </a>
          </div>
        </td>
        <td>
          <div>
            {new Date(this.props.timestamp).toUTCString()}
          </div>
        </td>
      </tr>
    );
  }
});

window.components.ActionTable = React.createClass({
  addRow: function(row){
    var _data = this.state.data;
    _data.unshift(row);
    this.setState({data:_data});
  },
  getInitialState: function() {
    return {data: []};
  },
  componentDidMount: function() {
    var self = this;

    socket.expectReply('subscribeToNewActions',{user_id:self.props.user_id}).then(
      function(docs){
        self.setState({data:docs.reverse()});

        socket.on(self.props.user_id+':newAttachment',function(msg){
          console.log("Received",msg);
          self.addRow(msg);
        });
      },
      function(err){
        alert(err);
      }
    );
  },
  render: function() {
    var self = this;
    var tiles = this.state.data.map(function(row){
      return (
        <ActionRow {...row} user_id={self.props.user_id} key={row.attach_id}/>
      );
    });
    return(
      <table className={'actionList'}>
        {tiles}
      </table>
    );
  }
});
