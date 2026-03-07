const repositoryWriteTails = new Map<string, Promise<void>>();

export async function withRepositoryWriteLock<T>(
  repositoryPath: string,
  action: () => Promise<T>,
): Promise<T> {
  const previousTail = repositoryWriteTails.get(repositoryPath) ?? Promise.resolve();

  let releaseCurrent!: () => void;
  const currentDone = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });

  const currentTail = previousTail.then(() => currentDone);
  repositoryWriteTails.set(repositoryPath, currentTail);

  await previousTail;

  try {
    return await action();
  } finally {
    releaseCurrent();

    if (repositoryWriteTails.get(repositoryPath) === currentTail) {
      repositoryWriteTails.delete(repositoryPath);
    }
  }
}
