const { findTasksFromPrBody, generateComments } = require('./utils')
const core = require("@actions/core");

const buildAsanaTaskUrl = (overrides = {}) => {
  const taskId = 'taskId' in overrides ? overrides.taskId : '123'
  const projectId = 'projectId' in overrides ? overrides.projectId : '123';
  const withSuffix = 'withSuffix' in overrides ? overrides.withSuffix : ''
  return `https://app.asana.com/0/${projectId}/${taskId}/${withSuffix}`
};

describe('utils', () => {
  it('should return exactly one task', () => {
    const body = `Some desc\n ${buildAsanaTaskUrl({ withSuffix: '/f' })}`
    const foundTasks = findTasksFromPrBody(body)
    expect(foundTasks.length).toEqual(1)
  });

  it('should return exactly 2 tasks', () => {
    const body = `Some desc\n ${buildAsanaTaskUrl({ withSuffix: '/f' })}\n${buildAsanaTaskUrl({ taskId: '3213123'})}`
    const foundTasks = findTasksFromPrBody(body)
    expect(foundTasks.length).toEqual(2)
  });

  it('should return exactly 1 tasks after trigger-phrase', () => {
    const body = `Some desc\n Closes ${buildAsanaTaskUrl({ withSuffix: '/f' })}\n closes ${buildAsanaTaskUrl({ taskId: '3213123'})}`
    const foundTasks = findTasksFromPrBody(body, 'closes')
    expect(foundTasks.length).toEqual(1)
  });

  it('should return exactly 2 tasks after trigger-phrase', () => {
    const body = `Some desc\n Closes ${buildAsanaTaskUrl({ withSuffix: '/f' })}\n closes ${buildAsanaTaskUrl({ taskId: '3213123'})}`
    const foundTasks = findTasksFromPrBody(body, '(C|c)loses')
    expect(foundTasks.length).toEqual(2)
  });

  it('should return 4 comments', () => {
    const body = `Some desc\n 
      Some task ${buildAsanaTaskUrl({ taskId: '1' })}\n
      Closes ${buildAsanaTaskUrl({ taskId: '2'})}\n
      relates ${buildAsanaTaskUrl({ taskId: '3', withSuffix: '/f' })}\n
      Mentions ${buildAsanaTaskUrl({ taskId: '4', withSuffix: '/f' })}`
    const inputs = {}
    const pullRequest = {
      body,
      html_url: "http://github.com/panther/pr/1"
    }
    const issue = {
      number: 10,
      repo: 'demo-repo'
    }
    jest.spyOn(core, 'getInput').mockImplementation((name, options) => {
      if(inputs[name] === undefined && options && options.required){
        throw new Error(name + " was not expected to be empty");
      }
      return inputs[name]
    })
    const comments = generateComments(pullRequest, issue)
    expect(comments.length).toEqual(4)
    expect(comments).toEqual([
      {
        taskId: '2',
        comment: 'A Pull Request closing this task has opened [demo-repo/10](http://github.com/panther/pr/1)',
        isPinned: true
      },
      {
        taskId: '3',
        comment: 'A Pull Request related to this task has opened [demo-repo/10](http://github.com/panther/pr/1)'
      },
      {
        taskId: '1',
        comment: 'A Pull Request mentioning this task has opened [demo-repo/10](http://github.com/panther/pr/1)'
      },
      {
        taskId: '4',
        comment: 'A Pull Request mentioning this task has opened [demo-repo/10](http://github.com/panther/pr/1)'
      }
    ])
  });
})