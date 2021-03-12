const { findTasksFromPrBody } = require('./utils')

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
})