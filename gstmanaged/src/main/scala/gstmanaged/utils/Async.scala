package gstmanaged.utils

import java.util.{Timer, TimerTask}
import java.util.concurrent.ConcurrentLinkedQueue

import scala.concurrent.{Future, Promise}
import scala.concurrent.duration.FiniteDuration

object Async {

  trait AddToCollectionCallback[T] extends ((T, Boolean) => Boolean) {
    def apply(value: T, isAlmostDone: Boolean): Boolean
  }

  /**
    *
    * @param operationName name for [[Timer]] thread name
    * @param totalTimeout time to collect values from returned [[AddToCollectionCallback]] into result
    * @param shortTimeout time to collect values after [[AddToCollectionCallback]] was called with isAlmostDone = true
    * @tparam T
    * @return
    */
  def makeCollectionFromCallback[T](
    operationName: String,
    totalTimeout: FiniteDuration,
    shortTimeout: FiniteDuration
  ): (AddToCollectionCallback[T], Future[Seq[T]]) = {

    import scala.jdk.CollectionConverters._

    val timer = new Timer(operationName)
    val collector = new ConcurrentLinkedQueue[T]()
    val resultPromise = Promise[Seq[T]]()

    def completeTask: TimerTask = new TimerTask {
      override def run(): Unit = {
        resultPromise.trySuccess(collector.iterator().asScala.toSeq)
        timer.cancel()
      }
    }

    timer.schedule(completeTask, totalTimeout.toMillis)

    val onNextItem: AddToCollectionCallback[T] =
      (item: T, isAlmostDone: Boolean) => {
        if (!resultPromise.isCompleted) {
          collector.add(item)
          if (isAlmostDone) {
            timer.schedule(completeTask, shortTimeout.toMillis)
          }
          true
        } else {
          false
        }
      }

    (onNextItem, resultPromise.future)
  }

}
