import { Center, Input, Loader, Pagination } from '@mantine/core'
import { Room } from '@prisma/client'
import {
  IconEye,
  IconHeart,
  IconHeartBroken,
  IconHeartbeat,
  IconSearch,
} from '@tabler/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import CustomSegmentedControl from 'components/CustomSegmentedControl'
import {
  CBbstyled,
  CHoverDiv,
  CenteringDiv,
  Cstyled,
  StyledImage,
} from 'components/styledComponent'
import { ROOM_CATEGORY_MAP, ROOM_TAKE, ROOM_YM_MAP } from 'constants/const'
import { useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { WISHLIST_QUERY_KEY } from 'constants/querykey'
import useDebounce from 'hooks/useDebounce'

//todo myspot analytics 에 어떤 내용 들어갈지도 생각 해봐야함

export default function Rooms() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const [category, setCategory] = useState<string>('-1')
  const [ym, setYm] = useState<string>('-1')
  const [activePage, setActivePage] = useState<number>(1)
  const mainKeyword = String(router.query.mainKeyword)

  //home으로부터 받은 검색어 값을 받는 state
  const [keyword, setKeyword] = useState<string>(() =>
    mainKeyword ? mainKeyword : ''
  )
  //검색어가 변경되었을 때 작동
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
  }
  const debouncedKeyword = useDebounce<string>(keyword)

  const ROOMS_TAKE_QUERY_KEY = `api/room/get-Rooms-take?skip=${
    (activePage - 1) * ROOM_TAKE
  }&take=${ROOM_TAKE}&category=${category}&ym=${ym}&contains=${debouncedKeyword}`

  const ROOMS_COUNT_QUERY_KEY = `api/room/get-Rooms-count?category=${category}&ym=${ym}&contains=${debouncedKeyword}`
  //get HOME_TAKE recomended Room (HOME_TAKE 수 만큼 방을 받아온다)
  const { data: rooms, isLoading } = useQuery<
    { rooms: Room[] },
    unknown,
    Room[]
  >([ROOMS_TAKE_QUERY_KEY], () =>
    fetch(ROOMS_TAKE_QUERY_KEY)
      .then((res) => res.json())
      .then((data) => data.items)
  )
  //get Rooms count
  const { data: total } = useQuery(
    [ROOMS_COUNT_QUERY_KEY],
    () =>
      fetch(ROOMS_COUNT_QUERY_KEY)
        .then((res) => res.json())
        .then((data) =>
          data.items === 0 ? 1 : Math.ceil(data.items / ROOM_TAKE)
        ),
    {
      onSuccess: async () => {
        setActivePage(1)
      },
    }
  )

  // get Wishlist (해당 유저의 관심 매물들)
  const { data: wishlist, isLoading: wishLoading } = useQuery(
    [WISHLIST_QUERY_KEY],
    () =>
      fetch(WISHLIST_QUERY_KEY)
        .then((res) => res.json())
        .then((data) => data.items)
  )
  // 매물들이 해당 유저의 관심 매물인지 확인하는 함수
  const isWished = (id: number) =>
    wishlist != null && id != null ? wishlist.includes(String(id)) : false

  // update User's wishlist & Room-wished
  const { mutate: updateWishlist } = useMutation<unknown, unknown, number, any>(
    (roomId) =>
      fetch('/api/wishlist/update-Wishlist', {
        method: 'POST',
        body: JSON.stringify(roomId),
      })
        .then((data) => data.json())
        .then((res) => res.items),
    {
      onMutate: async (roomId) => {
        await queryClient.cancelQueries({ queryKey: [WISHLIST_QUERY_KEY] })
        const previous = queryClient.getQueryData([WISHLIST_QUERY_KEY])

        //wishlist
        queryClient.setQueryData<string[]>([WISHLIST_QUERY_KEY], (old) =>
          old
            ? old.includes(String(roomId))
              ? old.filter((id) => id !== String(roomId))
              : old.concat(String(roomId))
            : []
        )

        //wished
        queryClient.setQueryData<Room[]>([ROOMS_TAKE_QUERY_KEY], (olds) =>
          olds
            ? olds.map((old) =>
                old.id === roomId
                  ? isWished(roomId)
                    ? { ...old, wished: old.wished - 1 }
                    : { ...old, wished: old.wished + 1 }
                  : { ...old }
              )
            : undefined
        )
        return previous
      },
      onError: (__, _, context) => {
        queryClient.setQueryData([WISHLIST_QUERY_KEY], context.previous)
      },
      onSuccess: async () => {
        queryClient.invalidateQueries([WISHLIST_QUERY_KEY])
        queryClient.invalidateQueries([ROOMS_TAKE_QUERY_KEY])
      },
    }
  )

  return (
    <div className="text-zinc-600 mt-20">
      <div>
        <div>
          <div className="grid grid-cols-3 rounded-md p-2 m-2 items-center">
            <Input
              icon={<IconSearch size={16} />}
              placeholder="지역을 입력하세요"
              value={keyword}
              onChange={handleChange}
            />
            <div className="ml-12">
              <CustomSegmentedControl
                value={category}
                onChange={setCategory}
                data={[
                  {
                    label: '전체',
                    value: '-1',
                  },
                  ...ROOM_CATEGORY_MAP.map((label, id) => ({
                    label: label,
                    value: String(id),
                  })),
                ]}
              />
            </div>
            <div className="ml-20">
              <CustomSegmentedControl
                value={ym}
                onChange={setYm}
                data={[
                  {
                    label: '전체',
                    value: '-1',
                  },
                  ...ROOM_YM_MAP.map((label, id) => ({
                    label: label,
                    value: String(id),
                  })),
                ]}
              />
            </div>
          </div>
        </div>
        {isLoading ? (
          <CenteringDiv className="m-40">
            <Loader />
          </CenteringDiv>
        ) : rooms?.length === 0 ? (
          <CenteringDiv className="mt-40 mb-40 text-xl font-bold">
            '{keyword}' 에 <br />
            해당하는 매물이 존재하지 않습니다.
          </CenteringDiv>
        ) : (
          <div className="flex flex-col space-y-3 mt-3 text-sm font-light text-zinc-500">
            {rooms &&
              rooms.map((room, idx) => (
                <div className="border-b p-3" key={idx}>
                  <div className="flex">
                    <CenteringDiv className="relative">
                      <StyledImage
                        onClick={() => router.push(`/rooms/${room.id}`)}
                        style={{
                          width: '280px',
                          height: '210px',
                          margin: '10px',
                        }}
                      >
                        <Image
                          className="styled"
                          src={room.images.split(',')[0]}
                          alt={'thumbnail'}
                          fill
                        />
                      </StyledImage>
                      {session ? (
                        <CHoverDiv className="absolute left-4 top-4">
                          {wishLoading ? (
                            <Loader size={15} />
                          ) : isWished(room.id) ? (
                            <IconHeart
                              onClick={() => {
                                updateWishlist(room.id)
                              }}
                              size={25}
                              color={'red'}
                              fill={'red'}
                            />
                          ) : (
                            <IconHeartBroken
                              onClick={() => {
                                updateWishlist(room.id)
                              }}
                              size={25}
                              stroke={1.5}
                            />
                          )}
                        </CHoverDiv>
                      ) : (
                        <>
                          <CHoverDiv>
                            <IconHeartbeat
                              onClick={() => {
                                router.push('/auth/login')
                              }}
                              size={25}
                              stroke={1.5}
                              className="absolute left-4 top-4"
                            />
                          </CHoverDiv>
                        </>
                      )}
                    </CenteringDiv>
                    <div className="p-3 w-full">
                      <div className="flex mb-1">
                        {room.title}
                        <CenteringDiv className="ml-auto text-xs">
                          <IconEye size={15} />
                          {room.views}
                          <IconHeart size={15} className="ml-1" />
                          {room.wished}
                        </CenteringDiv>
                      </div>
                      <div className="flex space-x-3">
                        <CBbstyled>매물 정보</CBbstyled>
                        <Cstyled>-</Cstyled>
                        <CBbstyled>
                          매물 종류 :{' '}
                          {ROOM_CATEGORY_MAP[Number(room.categoryId)]}
                        </CBbstyled>
                      </div>
                      <div className="flex space-x-3">
                        <CBbstyled>위치 정보</CBbstyled>
                        <Cstyled>-</Cstyled>
                        <CBbstyled>주소 : {room.address} </CBbstyled>
                        <CBbstyled>상세 : {room.detailAddress} </CBbstyled>
                      </div>
                      <div className="flex space-x-3">
                        <CBbstyled>거래 정보</CBbstyled>
                        <Cstyled>-</Cstyled>
                        {room.ym === '0' ? (
                          <>
                            <CBbstyled>전세 : {room.price} 만원</CBbstyled>
                          </>
                        ) : (
                          <>
                            <CBbstyled>보증금 : {room.deposit} 만원</CBbstyled>
                            <CBbstyled>월세 : {room.price} 만원</CBbstyled>
                          </>
                        )}
                      </div>
                      <div className="flex space-x-3">
                        <CBbstyled>기본 정보</CBbstyled>
                        <Cstyled>-</Cstyled>
                        <CBbstyled>크기 : {room.area} 평 </CBbstyled>
                      </div>
                    </div>
                  </div>
                </div>
              ))}{' '}
            <CenteringDiv className="mt-10">
              {total && (
                <Pagination
                  color={'gray'}
                  page={activePage}
                  onChange={setActivePage}
                  total={total}
                />
              )}
            </CenteringDiv>
          </div>
        )}
      </div>
    </div>
  )
}
