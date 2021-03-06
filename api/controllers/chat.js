const pool = require('../pool')
const async = require('async')
const express = require('express')
const router = express.Router()

const {requireAuth} = require('../auth')
const {processedString, processedTitleString, stringIsEmpty} = require('../helpers/stringHelpers')
const {poolQuery} = require('../helpers/')
const {generalChatId} = require('../siteConfig')
const {
  fetchChat,
  fetchMessages,
  fetchSingleChannel,
  fetchChannels,
  saveChannelMembers,
  updateLastRead
} = require('../helpers/chatHelpers')

router.get('/', requireAuth, (req, res) => {
  const {user, user: {lastChannelId}} = req
  fetchChat({user, channelId: lastChannelId || generalChatId}).then(
    results => res.send(results)
  ).catch(
    err => {
      console.error(err)
      if (err.status) return res.status(err.status).send({error: err})
      return res.status(500).send({error: err})
    }
  )
})

router.post('/', requireAuth, (req, res) => {
  const user = req.user
  const {message} = req.body
  const {channelId, content} = message
  const timeStamp = Math.floor(Date.now()/1000)
  if (message.userId !== user.id) {
    return res.status(401).send('Unauthorized')
  }

  poolQuery('UPDATE users SET ? WHERE id = ?', [{lastChannelId: channelId}, user.id]).then(
    () => updateLastRead({users: [{id: user.id}], channelId, timeStamp: Math.floor(Date.now()/1000)})
  ).then(
    () => {
      const query1 = `UPDATE msg_channel_info SET isHidden = '0' WHERE channelId = ?`
      const query2 = `
        INSERT INTO msg_chats SET channelId = ?, userId = ?,
        content = ?, timeStamp = ?
      `
      return Promise.all([
        poolQuery(query1, channelId),
        poolQuery(query2, [channelId, user.id, processedString(content), timeStamp])
      ])
    }
  ).then(
    results => res.send({messageId: Number(results[1].insertId)})
  ).catch(
    err => res.status(500).send(err)
  )
})

router.delete('/message', requireAuth, (req, res) => {
  const {user} = req
  const {messageId} = req.query
  poolQuery('DELETE FROM msg_chats WHERE id = ? AND userId = ?', [messageId, user.id]).then(
    () => res.send({success: true})
  ).catch(
    err => {
      console.error(err)
      res.status(500).send({error: err})
    }
  )
})

router.put('/message', requireAuth, (req, res) => {
  const {user} = req
  const {editedMessage, messageId} = req.body
  const query = 'UPDATE msg_chats SET ? WHERE id = ? AND userId = ?'
  poolQuery(query, [{content: processedString(editedMessage)}, messageId, user.id]).then(
    () => res.send({success: true})
  ).catch(
    err => {
      console.err(err)
      res.status(500).send({error: err})
    }
  )
})

router.get('/more/channels', requireAuth, (req, res) => {
  const {currentChannelId, lastChannelId} = req.query
  const {user} = req
  fetchChannels(user, currentChannelId, lastChannelId).then(
    channels => res.send(channels)
  ).catch(
    err => {
      console.error(err)
      res.status(500).send({error: err})
    }
  )
})

router.get('/more/messages', requireAuth, (req, res) => {
  const user = req.user
  if (Number(req.query.userId) !== user.id) {
    return res.status(401).send('Unauthorized')
  }
  const {messageId, channelId} = req.query
  const query = `
    SELECT a.id, a.channelId, a.userId, a.content, a.timeStamp, a.isNotification, b.username, c.id AS profilePicId
    FROM msg_chats a LEFT JOIN users b ON a.userId = b.id LEFT JOIN users_photos c ON a.userId = c.userId AND c.isProfilePic = '1' WHERE a.id < ? AND a.channelId = ? ORDER BY id DESC LIMIT 21
  `
  pool.query(query, [messageId, channelId], (err, rows) => {
    if (err) {
      console.error(err)
      return res.status(500).send({error: err})
    }
    res.send(rows)
  })
})

router.get('/channels', requireAuth, (req, res) => {
  const user = req.user
  const {currentChannelId} = req.query
  fetchChannels(user, currentChannelId).then(
    channels => res.send(channels)
  ).catch(
    err => res.status(500).send({error: err})
  )
})

router.get('/channel', requireAuth, (req, res) => {
  const user = req.user
  const channelId = Number(req.query.channelId) || generalChatId

  updateLastRead({users: [{id: user.id}], channelId, timeStamp: Math.floor(Date.now()/1000)})
  return fetchMessages(channelId).then(
    messages => poolQuery('UPDATE users SET ? WHERE id = ?', [{lastChannelId: channelId}, user.id]).then(
      () => Promise.resolve(messages)
    )
  ).then(
    messages => {
      return fetchSingleChannel(channelId, user.id).then(
        channel => res.send({messages, channel})
      )
    }
  ).catch(
    err => {
      console.error(err)
      res.status(500).send({error: err})
    }
  )
})

router.get('/channel/check', requireAuth, (req, res) => {
  let partnerId = Number(req.query.partnerId)
  let myUserId = req.user.id
  const query = `
    SELECT * FROM

    (SELECT b.channelId AS id FROM users a JOIN msg_channel_members b ON a.id = b.userId
    JOIN msg_channels c ON b.channelId = c.id AND c.twoPeople = '1'
    WHERE a.id = '${myUserId}') A

    JOIN

    (SELECT b.channelId AS id FROM users a JOIN msg_channel_members b ON a.id = b.userId
    JOIN msg_channels c ON b.channelId = c.id AND c.twoPeople = '1'
    WHERE a.id = '${partnerId}') B

    ON

    A.id = B.id
  `
  poolQuery(query).then(
    rows => {
      let query = `
        SELECT a.id, a.channelId, a.userId, a.content, a.timeStamp, b.username,
        c.id AS profilePicId FROM msg_chats a
        JOIN users b ON a.userId = b.id
        LEFT JOIN users_photos c ON a.userId = c.userId AND c.isProfilePic = '1'
        WHERE a.channelId = ? ORDER BY id DESC LIMIT 21
      `
      let channelId = rows.length > 0 ? rows[0].id : 0
      if (rows.length > 0) {
        return poolQuery(query, channelId).then(
          rows => Promise.resolve({
            channelId,
            lastMessage: rows[0].content,
            lastUpdate: rows[0].timeStamp,
            lastMessageSender: {
              id: rows[0].userId,
              username: rows[0].username
            },
            messages: rows
          })
        )
      }
      return Promise.resolve({channelId, messages: []})
    }
  ).then(
    result => res.send(result)
  ).catch(
    err => {
      console.error(err)
      return res.status(500).send({error: err})
    }
  )
})

router.post('/lastRead', requireAuth, (req, res) => {
  const user = req.user
  const channelId = req.body.channelId
  updateLastRead({users: [{id: user.id}], channelId, timeStamp: Math.floor(Date.now()/1000)}).then(
    () => res.send({success: true})
  ).catch(
    err => res.status(500).send({error: err})
  )
})

router.post('/channel', requireAuth, (req, res) => {
  const user = req.user
  const params = req.body.params
  const channelName = processedTitleString(params.channelName)
  const timeStamp = Math.floor(Date.now()/1000)

  poolQuery('INSERT INTO msg_channels SET ?', {channelName, creator: user.id}).then(
    result => Promise.resolve(result.insertId)
  ).then(
    channelId => {
      const members = [user.id].concat(params.selectedUsers.map(user => {
        return user.userId
      }))
      const message = {
        channelId,
        userId: user.id,
        content: `Created channel "${channelName}"`,
        timeStamp,
        isNotification: true
      }
      updateLastRead({users: members.map(member => ({id: member})), channelId, timeStamp: timeStamp - 1})
      return Promise.all([
        saveChannelMembers(channelId, members),
        poolQuery('INSERT INTO msg_chats SET ?', message)
      ]).then(
        ([, result]) => Promise.resolve(Object.assign({}, message, {
          username: user.username,
          profilePicId: user.profilePicId,
          messageId: result.insertId,
          channelName
        }))
      )
    }
  ).then(
    message => poolQuery('UPDATE users SET ? WHERE id = ?', [{lastChannelId: message.channelId}, user.id]).then(
      () => Promise.resolve(message)
    )
  ).then(
    message => {
      let query = `
        SELECT a.userId, b.username FROM
        msg_channel_members a LEFT JOIN users b ON
        a.userId = b.id WHERE a.channelId = ?
      `
      return poolQuery(query, message.channelId).then(
        members => Promise.resolve({members, message})
      )
    }
  ).then(
    ({members, message}) => {
      res.send({message, members})
    }
  ).catch(
    err => {
      console.error(err)
      return res.status(500).send({error: err})
    }
  )
})

router.post('/channel/twoPeople', requireAuth, (req, res) => {
  const user = req.user
  const {partnerId, timeStamp} = req.body
  const content = processedString(req.body.message)
  if (user.id !== req.body.userId) {
    return res.status(401).send({error: 'Session mismatch'})
  }

  poolQuery('INSERT INTO msg_channels SET ?', {twoPeople: true}).then(
    result => {
      updateLastRead({users: [{id: partnerId}, {id: user.id}], channelId: result.insertId, timeStamp: timeStamp - 1})
      return Promise.resolve(result.insertId)
    }
  ).then(
    channelId => Promise.all([
      saveChannelMembers(channelId, [user.id, partnerId]),
      poolQuery('INSERT INTO msg_chats SET ?', {channelId, userId: user.id, content, timeStamp})
    ]).then(
      ([, result]) => Promise.resolve({channelId, messageId: result.insertId})
    )
  ).then(
    ({channelId, messageId}) => poolQuery('UPDATE users SET ? WHERE id = ?', [{lastChannelId: channelId}, user.id]).then(
      () => Promise.resolve({channelId, messageId})
    )
  ).then(
    ({channelId, messageId}) => {
      let query = `
        SELECT a.userId, b.username FROM
        msg_channel_members a LEFT JOIN users b ON
        a.userId = b.id WHERE a.channelId = ?
      `
      poolQuery(query, channelId).then(
        members => res.send({
          id: messageId,
          messageId,
          channelId,
          userId: user.id,
          username: user.username,
          profilePicId: user.profilePicId,
          members,
          content,
          timeStamp
        })
      )
    }
  ).catch(
    err => {
      console.error(err)
      return res.status(500).send({error: err})
    }
  )
})

router.delete('/channel', requireAuth, (req, res) => {
  const {user} = req
  const {channelId: channelIdString, timeStamp: timeStampString} = req.query
  const channelId = Number(channelIdString)
  const timeStamp = Number(timeStampString)

  async.parallel([postLeaveNotification, leaveChannel], (err, results) => {
    if (err) {
      console.error(err)
      return res.status(500).send({error: err})
    }
    res.send({success: true})
  })

  function postLeaveNotification(callback) {
    let post = {
      channelId,
      userId: user.id,
      content: 'Left the channel',
      timeStamp,
      isNotification: true,
      isSilent: true
    }
    let query = 'INSERT INTO msg_chats SET ?'
    pool.query(query, post, err => {
      callback(err)
    })
  }

  function leaveChannel(callback) {
    let query = 'DELETE FROM msg_channel_members WHERE channelId = ? AND userId = ?'
    pool.query(query, [channelId, user.id], err => {
      callback(err)
    })
  }
})

router.post('/hideChat', requireAuth, (req, res) => {
  const {user} = req
  const {channelId} = req.body

  const query = 'UPDATE msg_channel_info SET ? WHERE userId = ? AND channelId = ?'
  pool.query(query, [{isHidden: true}, user.id, channelId], (err) => {
    if (err) {
      console.error(err)
      return res.status(500).send({error: err})
    }
    res.send({success: true})
  })
})

router.post('/invite', requireAuth, (req, res) => {
  const {user} = req
  const {channelId, selectedUsers} = req.body
  const timeStamp = Math.floor(Date.now()/1000)
  async.waterfall([
    callback => {
      let query = [
        'SELECT a.channelName FROM msg_channels a WHERE a.id IN ',
        '(SELECT b.channelId FROM msg_channel_members b WHERE channelId = ? AND userId = ?)'
      ].join('')
      pool.query(query, [channelId, user.id], (err, rows) => {
        if (rows[0].length === 0) {
          return callback('not_a_member')
        }
        callback(err, rows[0].channelName)
      })
    },
    (channelName, callback) => {
      let query = 'INSERT INTO msg_channel_members SET ?'
      let taskArray = selectedUsers.reduce(
        (taskArray, user) => {
          return taskArray.concat([
            callback => {
              pool.query(query, {channelId, userId: user.userId}, err => {
                callback(err)
              })
            }
          ])
        }, []
      )
      taskArray.push(
        callback => {
          let usernames = selectedUsers.map(user => user.username)
          let lastUser = usernames[usernames.length - 1]
          usernames.pop()
          if (usernames.length === 1) {
            usernames = `${usernames[0]} and ${lastUser}`
          } else if (usernames.length > 1) {
            usernames = `${usernames.join(', ')} and ${lastUser}`
          } else {
            usernames = lastUser
          }

          let content = `Invited ${usernames} to the channel`
          let query = 'INSERT INTO msg_chats SET ?'
          let message = {isNotification: true, channelId, userId: user.id, content, timeStamp}
          pool.query(query, message, (err, res) => {
            let messageId = res.insertId
            message = Object.assign({}, message, {
              id: messageId,
              username: user.username,
              channelName,
              profilePicId: user.profilePicId
            })
            callback(err, message)
          })
        }
      )
      async.parallel(taskArray, (err, results) => {
        callback(err, results[results.length - 1])
      })
    }
  ], (err, message) => {
    if (err) {
      let status = (err === 'not_a_member') ? 401 : 500
      return res.status(status).send({error: err})
    }
    let allUsers = selectedUsers.concat([{userId: user.id}]).map(user => ({id: user.userId}))
    updateLastRead({users: allUsers, channelId, timeStamp: timeStamp - 1})
    res.send({message})
  })
})

router.get('/numUnreads', requireAuth, (req, res) => {
  const user = req.user
  const query = `
    SELECT a.channelId, (SELECT COUNT(*) FROM msg_chats b WHERE b.isSilent = '0' AND b.channelId = a.channelId AND b.timeStamp > a.lastRead AND b.userId != ?) AS numUnreads FROM msg_channel_info a WHERE a.userId = ?  AND a.channelId IN (SELECT channelId FROM msg_channel_members WHERE userId = ?) AND a.channelId IN (SELECT id FROM msg_channels)
  `
  pool.query(query, [user.id, user.id, user.id], (err, rows) => {
    if (err) {
      console.error(err)
      return res.status(500).send({error: err})
    }
    let totalNumUnreads = rows.reduce((sum, row) => (
      sum + Number(row.numUnreads)
    ), 0)
    res.send({numUnreads: totalNumUnreads})
  })
})

router.get('/search/chat', requireAuth, (req, res) => {
  const {user} = req
  const text = req.query.text
  let query = `
    SELECT
      members.channelId,
      COALESCE(info.channelName, channels.channelName, users.username) AS label,
      channels.twoPeople,
      users.id AS userId,
      users.realName AS subLabel
    FROM
      msg_channel_members members
    JOIN
      msg_channels channels
    ON
      members.channelId = channels.id
    JOIN
      msg_channel_info info
    ON
      channels.id = info.channelId
      AND
      info.userId = ${user.id}
    LEFT JOIN
      users users
    ON
      members.userId = users.id
    WHERE
      (
        (
          members.userId = ${user.id}
          AND
          channels.twoPeople = 0
        )
        AND
        (
          IFNULL(info.channelName, channels.channelName) LIKE ?
        )
      )
    OR
      (
        (members.userId != ${user.id} AND channels.twoPeople = 1)
        AND
        (users.username LIKE ? OR users.realName LIKE ?)
      )
    OR
      (
        (channels.id = 2) AND (channels.channelName LIKE ?)
      )
    LIMIT 10
  `
  return poolQuery(query, [`%${text}%`, `%${text}%`, `%${text}%`, `%${text}%`]).then(
    primaryRes => {
      let remainder = 10 - primaryRes.length
      let query = `
        SELECT id AS userId, username AS label, realName AS subLabel FROM users WHERE (username LIKE ?
        OR realName LIKE ?) AND id != ${user.id} LIMIT ${remainder}
      `
      if (remainder > 0) {
        return poolQuery(query, [`%${text}%`, `%${text}%`]).then(
          secondaryRes => Promise.resolve({primaryRes, secondaryRes})
        )
      }
      return Promise.resolve({primaryRes, secondaryRes: []})
    }
  ).then(
    ({primaryRes, secondaryRes}) => {
      let finalRes = primaryRes.map(
        res => Object.assign({}, res, {primary: true})
      ).concat(
        secondaryRes.filter(row => {
          let remains = true
          for (let i = 0; i < primaryRes.length; i++) {
            if (row.label === primaryRes[i].label) remains = false
          }
          return remains
        }).map(
          res => Object.assign({}, res, {primary: false})
        )
      )
      res.send(finalRes)
    }
  ).catch(err => {
    console.error(err)
    return res.status(500).send({error: err})
  })
})

router.get('/search/users', (req, res) => {
  const text = req.query.text
  if (stringIsEmpty(text) || text.length < 2) return res.send([])
  const query = 'SELECT * FROM users WHERE (username LIKE ?) OR (realName LIKE ?) LIMIT 5'
  pool.query(query, ['%' + text + '%', '%' + text + '%'], (err, rows) => {
    if (err) {
      console.error(err)
      res.status(500).send({error: err})
    }
    res.send(rows)
  })
})

router.post('/title', requireAuth, (req, res) => {
  const {user} = req
  const {title, channelId} = req.body
  const query = 'UPDATE msg_channel_info SET ? WHERE userId = ? AND channelId = ?'
  pool.query(query, [{channelName: title}, user.id, channelId], err => {
    if (err) return res.status(500).send({error: err})
    res.send({success: true})
  })
})

module.exports = router
