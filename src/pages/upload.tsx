import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Button,
  FileButton,
  Input,
  Loader,
  SegmentedControl,
  Textarea,
} from '@mantine/core'
import { IconExclamationCircle, IconMapPin, IconSlash } from '@tabler/icons'
import Map from 'components/Map'
import { CenteringDiv } from 'components/styledComponent'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Room } from '@prisma/client'
import { ROOM_QUERY_KEY } from 'constants/querykey'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

//todo 내 방관리에서는 올린 매물 보여주고 그 매물 정보 수정할 수도 있게 -> db updated

//todo 여유가 된다면 추가정보 및 디테일 들도 받을 수 있게 해보자

export default function upload() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const placeholder = `[상세설명 작성 주의사항]
  - 매물 정보와 관련없는 홍보성 정보는 입력할 수 없습니다.
  - 매물등록 규정에 위반되는 금칙어는 입력할 수 없습니다.
  
  위 주의사항 위반시 임의로 매물 삭제 혹은 서비스 이용이 제한될 수 있습니다.`
  //방 내놓기인지 내 방관리인지 확인하는 state
  const [isUploadPage, setIsUploadPage] = useState(true)
  //db에 올릴 state
  const [category, setCategory] = useState<string>('0')
  const [ym, setYm] = useState<string>('0') //전/월세 -> 월세는 deposit 받음
  const depositRef = useRef<HTMLInputElement | null>(null)
  const priceRef = useRef<HTMLInputElement | null>(null)
  const areaRef = useRef<HTMLInputElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const [images, setImages] = useState<string[]>([])

  //daum-postcode
  const addrRef = useRef<HTMLInputElement | null>(null)
  // const [addr, setAddr] = useState<string>('')
  const detailAddrRef = useRef<HTMLTextAreaElement | null>(null)
  // const [detailAddr, setDetailAddr] = useState<string>('')
  //주소 검색을 눌렀는지 확인하는 state
  const [addrSearchComplete, setAddrSearchComplete] = useState<boolean>(false)
  //daum-postcode 띄우는 함수
  const loadLayout = () => {
    window.daum.postcode.load(() => {
      const postcode = new window.daum.Postcode({
        oncomplete: function (data: any) {
          if (data.userSelectedType === 'R') {
            // 사용자가 도로명 주소를 선택했을 경우
            if (addrRef.current) {
              addrRef.current.value = data.roadAddress
            }
          } else {
            // 사용자가 지번 주소를 선택했을 경우(J)
            if (addrRef.current) {
              addrRef.current.value = data.jibunAddress
            }
          }
          setAddrSearchComplete(true) //주소 검색이 되었는지 확인
        },
      })
      postcode.open({
        q: addrRef.current?.value,
      })
    })
  }
  //위치 정보 주소 쓰는 input에서 enter 를 누르면 바로 '주소검색' 버튼이 눌리게 기능 구현
  const postcodeButtonRef = useRef<HTMLButtonElement | null>(null)
  const handleEnterKeypress = (e: any) => {
    if (e.keyCode == 13) {
      if (postcodeButtonRef.current) {
        postcodeButtonRef.current.click()
      }
    }
  }

  //Image Uploader
  const [files, setFiles] = useState<File[]>([])
  useEffect(() => {
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData()

        fd.append('image', files[i], files[i].name)
        fetch(
          'https://api.imgbb.com/1/upload?expiration=600&key=340eff97531848cc7ed74f9ea0a716de',
          { method: 'POST', body: fd }
        )
          .then((res) => res.json())
          .then((data) => {
            console.log(data)

            setImages((prev) =>
              Array.from(new Set(prev.concat(data.data.image.url)))
            )
          })
          .catch((error) => console.log(error))
      }
    }
  }, [files])

  //입력받은 room data POST
  const { mutate: addRoom } = useMutation<
    unknown,
    unknown,
    Omit<Room, 'userId' | 'id' | 'updatedAt' | 'status'>,
    any
  >(
    (room) =>
      fetch('/api/room/add-Room', {
        method: 'POST',
        body: JSON.stringify(room),
      })
        .then((data) => data.json())
        .then((res) => res.items),
    {
      onMutate: () => {
        queryClient.invalidateQueries([ROOM_QUERY_KEY])
      },
      onSuccess: async () => {
        setCategory('0')
        setYm('0')
        setImages([])
        setIsUploadPage(false)
      },
    }
  )

  const validate = (type: 'submit') => {
    if (type === 'submit') {
      addrRef.current?.value == ''
        ? alert('주소를 입력하세요.')
        : detailAddrRef.current?.value == ''
        ? alert('상세 주소를 입력하세요.')
        : ym === '1' && depositRef.current?.value == ''
        ? alert('보증금을 입력하세요.')
        : priceRef.current?.value == ''
        ? alert('가격을 입력하세요.')
        : areaRef.current?.value == ''
        ? alert('건물 크기를 입력하세요.')
        : titleRef.current?.value == ''
        ? alert('제목을 입력하세요')
        : descriptionRef.current?.value == ''
        ? alert('상세 설명을 입력하세요.')
        : images.length < 4
        ? alert('최소 3장의 이미지를 추가해주세요')
        : addRoom({
            category: category,
            ym: ym,
            address: String(addrRef.current?.value),
            detailAddress: String(detailAddrRef.current?.value),
            area: Number(areaRef.current?.value),
            price: Number(priceRef.current?.value),
            deposit: Number(depositRef.current?.value),
            images: images.join(','),
            title: String(titleRef.current?.value),
            description: String(descriptionRef.current?.value),
          })
    }
  }

  //upload 페이지 진입할 때 로그인 되어있는지 검사
  useEffect(() => {
    session ?? router.push('/auth/login')
  }, [])

  return session ? (
    <div className="text-sm">
      <CenteringDiv className="m-14">
        <Link href="/" className="flex">
          <Image
            className="mr-1"
            src="/../public/images/home.png"
            alt="home"
            width={55}
            height={55}
          ></Image>
          <div className="text-3xl">MySpot</div>
        </Link>
      </CenteringDiv>
      {isUploadPage ? (
        <>
          <CenteringDiv>
            <button
              className=" border border-zinc-400 bg-zinc-600 text-zinc-100"
              style={{ width: '50vw', height: '5vh' }}
              onClick={() => setIsUploadPage(true)}
            >
              방 내놓기
            </button>
            <button
              className=" border border-zinc-400"
              style={{ width: '50vw', height: '5vh' }}
              onClick={() => setIsUploadPage(false)}
            >
              내 방 관리
            </button>
          </CenteringDiv>
          <div className="w-full mt-6 p-4  border border-zinc-300 text-zinc-500 text-xs leading-5">
            ∙ 전/월세 매물만 등록할 수 있습니다.
            <br />∙ 한 번에 1개의 매물만 등록 가능하며, 직거래로 표시됩니다.
            <br />∙ 등록한 매물은 30일 간 노출됩니다.
          </div>
          <CenteringDiv className="relative flex-col border border-zinc-400 mt-6">
            <div className="flex font-bold m-3">
              <span>매물 정보</span>
            </div>
            <div className="flex w-full border-t border-zinc-400 text-xs items-center">
              <CenteringDiv className="w-32">매물 종류</CenteringDiv>
              <CenteringDiv className="p-3  border-l border-zinc-400">
                <SegmentedControl
                  value={category}
                  onChange={setCategory}
                  color={'gray'}
                  styles={(theme) => ({
                    root: {
                      backgroundColor: 'white',
                    },
                    label: { marginRight: 10, marginLeft: 10 },
                    active: {
                      marginRight: 10,
                      marginLeft: 10,
                      backgroundColor: '#52525B',
                    },
                    control: { borderWidth: '0px !important' },
                  })}
                  transitionDuration={0}
                  data={[
                    { label: '원룸', value: '0' },
                    { label: '투룸', value: '1' },
                    { label: '쓰리룸', value: '2' },
                    { label: '그 외', value: '3' },
                  ]}
                />
              </CenteringDiv>
            </div>
          </CenteringDiv>
          <CenteringDiv className="relative flex-col  border border-zinc-400 mt-6 ">
            <div className="flex font-bold m-3">
              <span>위치 정보</span>
              <div className="absolute right-5">
                <span className="text-zinc-400" style={{ fontSize: 12 }}>
                  *등기부등본 상의 주소를 입력해 주세요.
                </span>
              </div>
            </div>
            <div className="flex items-center w-full border-t border-zinc-400 text-xs">
              <CenteringDiv className="w-32">주소</CenteringDiv>
              <div className="h-72 border-l border-zinc-400 pl-10 pt-14">
                <div className="flex items-center text-zinc-400 mb-3">
                  <IconExclamationCircle className="mr-1" />
                  <span>
                    도로명, 건물명, 지번에 대해 통합검색이 가능합니다.
                  </span>
                </div>
                <div className="flex mb-5">
                  <Input
                    className="w-full"
                    id="input"
                    type={'text'}
                    placeholder="예) 번동 10-1, 강북구 번동"
                    ref={addrRef}
                    // value={addr}
                    // onChange={
                    //   () =>
                    //     addrRef.current
                    //       ? setAddr(addrRef.current.value)
                    //       : setAddr('') //글자 지울때 마지막 하나 글자 지울 수 있게 함
                    // }
                    onKeyUp={handleEnterKeypress}
                  />
                  <Button
                    className="bg-zinc-600 text-zinc-100 ml-1"
                    radius={'sm'}
                    color={'gray'}
                    onClick={loadLayout}
                    ref={postcodeButtonRef}
                  >
                    주소 검색
                  </Button>
                </div>
                <Textarea
                  className="w-full"
                  minRows={4}
                  placeholder="상세 주소) 동, 호수 등"
                  ref={detailAddrRef}
                  // value={detailAddr}
                  // onChange={
                  //   () =>
                  //     detailAddrRef.current
                  //       ? setDetailAddr(detailAddrRef.current.value)
                  //       : setDetailAddr('') //글자 지울때 마지막 하나 글자 지울 수 있게 함
                  // }
                />
              </div>
              <div className="ml-12 p-3">
                {addrSearchComplete ? (
                  <Map
                    width="330px"
                    height="300px"
                    address={addrRef.current?.value}
                  />
                ) : (
                  <CenteringDiv
                    className="border flex-col text-zinc-400"
                    style={{ width: '330px', height: '300px' }}
                  >
                    <IconMapPin />
                    <div>주소 검색을 하시면</div>
                    <div>해당 위치가 지도에 표시됩니다.</div>
                  </CenteringDiv>
                )}
              </div>
            </div>
          </CenteringDiv>
          <CenteringDiv className="relative flex-col  border border-zinc-400 mt-6">
            <div className="flex font-bold m-3">
              <span>거래 정보</span>
            </div>
            <div className="flex w-full  border-t border-zinc-400 text-xs items-center">
              <div className="w-32 flex justify-center">거래 종류</div>
              <CenteringDiv className="p-3  border-l border-zinc-400">
                <SegmentedControl
                  className="mr-5"
                  value={ym}
                  onChange={setYm}
                  color={'gray'}
                  styles={(theme) => ({
                    root: {
                      backgroundColor: 'white',
                    },
                    label: { marginRight: 10, marginLeft: 10 },
                    active: {
                      marginRight: 10,
                      marginLeft: 10,
                      backgroundColor: '#52525B',
                    },
                    control: { borderWidth: '0px !important' },
                  })}
                  transitionDuration={0}
                  data={[
                    { label: '전세', value: '0' },
                    { label: '월세', value: '1' },
                  ]}
                />
                {ym === '0' ? (
                  <>
                    <CenteringDiv className="space-x-1">
                      <Input type="text" placeholder="전세" ref={priceRef} />
                      <span>만원</span>
                    </CenteringDiv>
                  </>
                ) : (
                  <>
                    <CenteringDiv className="space-x-1">
                      <Input
                        type="text"
                        placeholder="보증금"
                        ref={depositRef}
                      />
                      <IconSlash />
                      <Input type="text" placeholder="월세" ref={priceRef} />
                      <span>만원</span>
                    </CenteringDiv>
                  </>
                )}
              </CenteringDiv>
            </div>
          </CenteringDiv>
          <CenteringDiv className="relative flex-col  border border-zinc-400 mt-6">
            <div className="flex font-bold m-3">
              <span>기본 정보</span>
            </div>
            <div className="flex w-full  border-t border-zinc-400 text-xs items-center">
              <div className="w-32 flex justify-center">건물 크기</div>
              <CenteringDiv className="p-3  border-l border-zinc-400">
                <div className="flex ">
                  <Input type="text" placeholder="평" ref={areaRef} />
                </div>
              </CenteringDiv>
            </div>
          </CenteringDiv>
          <CenteringDiv className="relative flex-col border border-zinc-400 mt-6">
            <div className="flex font-bold m-3">
              <span>상세 정보</span>
            </div>
            <div className="flex flex-col w-full  border-t border-zinc-400 text-xs items-center">
              <div className="flex w-full items-center  border-b border-zinc-300">
                <div className="w-32 flex justify-center">제목</div>
                <div className="p-3  border-l border-zinc-400">
                  <Input
                    style={{ width: '800px' }}
                    placeholder="예) 신논현역 도보 5분거리, 혼자 살기 좋은 방 입니다."
                    ref={titleRef}
                  />
                </div>
              </div>
              <div className="flex w-full items-center">
                <div className="w-32 flex justify-center">상세 설명</div>
                <div className="p-3  border-l border-zinc-400">
                  <Textarea
                    style={{ width: '800px' }}
                    minRows={8}
                    wrap="hard"
                    placeholder={placeholder}
                    ref={descriptionRef}
                  />
                </div>
              </div>
            </div>
          </CenteringDiv>
          <div className="relative flex flex-col  border border-zinc-400 mt-6 items-center">
            <div className="flex font-bold m-3">
              <span>사진 등록</span>
            </div>
            <div className="flex flex-col w-full p-3  border-t border-zinc-400 text-xs items-center">
              <div className="p-3 w-full border border-zinc-300 text-zinc-500 text-xs leading-5">
                - 사진은 가로로 찍은 사진을 권장합니다.
                <br />- 사진 용량은 사진 한 장당 200KB 까지 등록 가능합니다.
                <br />- 사진은 최소 3장 이상 등록해야하며, 최대 8장 까지
                권장합니다.
              </div>
              <div>
                <div className="m-5 p-5 bg-zinc-100" style={{ width: '950px' }}>
                  <div className="mb-5">
                    <FileButton accept="image/*" multiple onChange={setFiles}>
                      {(props) => (
                        <Button
                          {...props}
                          className="bg-zinc-600 text-zinc-100 ml-1"
                          radius={'sm'}
                          color={'gray'}
                        >
                          사진 추가하기
                        </Button>
                      )}
                    </FileButton>
                  </div>
                  <div className="grid grid-cols-4 items-center space-y-2">
                    {images &&
                      images.length > 0 &&
                      images.map((image, idx) => (
                        <Image
                          className="border border-zinc-400"
                          alt={'img'}
                          key={idx}
                          src={image}
                          width={200}
                          height={200}
                        />
                      ))}
                  </div>
                </div>
              </div>
              <div
                className="flex items-center text-zinc-400 mr-auto"
                style={{ fontSize: '13px' }}
              >
                <IconExclamationCircle size={18} className="mr-1" />
                <span>
                  허위 매물을 등록할 경우 MySpot에서 임의로 계정 및 매물 전체
                  삭제 처리됩니다.
                </span>
              </div>
            </div>
          </div>
          <CenteringDiv className="m-5 space-x-5">
            <button
              className=" border border-zinc-400 rounde"
              style={{ width: '120px', height: '50px' }}
            >
              취소
            </button>
            <button
              className=" border border-zinc-400 bg-zinc-600 text-zinc-100"
              style={{ width: '120px', height: '50px' }}
              onClick={() => {
                validate('submit')
              }}
            >
              등록하기
            </button>
          </CenteringDiv>
        </>
      ) : (
        <>
          <CenteringDiv>
            <button
              className=" border border-zinc-400 "
              style={{ width: '50vw', height: '5vh' }}
              onClick={() => setIsUploadPage(true)}
            >
              방 내놓기
            </button>
            <button
              className=" border border-zinc-400 bg-zinc-600 text-zinc-100"
              style={{ width: '50vw', height: '5vh' }}
              onClick={() => setIsUploadPage(false)}
            >
              내 방 관리
            </button>
          </CenteringDiv>
          <div className="w-full mt-6 p-4  border border-zinc-300 text-zinc-500 text-xs leading-5">
            ∙ 전/월세 매물만 등록할 수 있습니다.
            <br />∙ 한 번에 1개의 매물만 등록 가능하며, 직거래로 표시됩니다.
            <br />∙ 등록한 매물은 30일 간 노출됩니다.
            <br />∙ 공개중 : 내가 등록한 매물이 공개중인 상태
            <br />∙ 거래완료 : 등록한 매물이 거래완료된 상태
          </div>
          <CenteringDiv className="mt-40 mb-40">
            <div>등록된 매물이 없습니다.</div>
          </CenteringDiv>
        </>
      )}
    </div>
  ) : (
    <CenteringDiv className="m-40">
      <Loader></Loader>
    </CenteringDiv>
  )
}
