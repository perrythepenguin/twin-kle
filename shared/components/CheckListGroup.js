import React, { Component } from 'react';

export default class ListGroup extends Component {
  render() {
    const { listItems, inputType, name, onSelect } = this.props;
    return (
      <div
        className="row container-fluid unselectable"
        {...this.props}
      >
        {
          listItems.map(listItem => {
            const index = listItems.indexOf(listItem);
            let leftStyle = {
              borderTopLeftRadius: '0px',
              borderBottomLeftRadius: '0px',
              borderBottom: 'none'
            }
            let rightStyle = {
              borderTopRightRadius: '0px',
              borderBottomRightRadius: '0px',
              borderTopLeftRadius: '0px',
              borderBottomLeftRadius: '0px',
              borderBottom: 'none'
            }
            if (index === 0 && listItems.length !== 1) {
              leftStyle = {
                borderBottomLeftRadius: '0px',
                borderBottom: 'none'
              };
              rightStyle = {
                borderTopRightRadius: '5px',
                borderBottomRightRadius: '0px',
                borderBottomLeftRadius: '0px',
                borderBottom: 'none'
              };
            }
            if (index === listItems.length - 1) {
              leftStyle = {
                borderTopLeftRadius: '0px',
                borderBottomLeftRadius: '5px'
              };
              rightStyle = {
                borderTopRightRadius: '0px',
                borderBottomRightRadius: '5px',
                borderTopLeftRadius: '0px',
                borderBottomLeftRadius: '0px'
              };
            }
            if (index === 0 && listItems.length === 1) {
              leftStyle = {
                borderTopLeftRadius: '5px',
                borderBottomLeftRadius: '5px'
              };
              rightStyle = {
                borderTopRightRadius: '5px',
                borderBottomRightRadius: '5px',
                borderBottomLeftRadius: '0px',
              };
            }
            return (
              <div
                className="input-group"
                key={index}
              >
                <label
                  className="input-group-addon"
                  style={leftStyle}
                >
                  <input
                    type={inputType}
                    name={name}
                    onChange={() => onSelect(index)}
                    checked={listItem.checked}
                    style={{
                      cursor: 'pointer'
                    }}
                  />
                </label>
                <div
                  className="list-group-item check-list-item"
                  style={rightStyle}
                  onClick={() => onSelect(index)}
                >
                  <span>{listItem.label}</span>
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }
}